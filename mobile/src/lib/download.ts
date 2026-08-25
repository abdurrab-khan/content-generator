import * as FileSystem from 'expo-file-system/legacy';

/**
 * Authenticated video downloads → device gallery.
 *
 * Uses the legacy FileSystem API (`createDownloadResumable`) because it
 * supports request headers (the API requires a Bearer token) and progress
 * callbacks. Files land in the app cache first, then get copied into the
 * user's gallery via MediaLibrary and the cache copy is removed.
 *
 * MediaLibrary notes:
 *  - The `./legacy` entry targets the `ExpoMediaLibrary` native module that
 *    ships inside Expo Go. The default export of expo-media-library is the
 *    "next" API (`ExpoMediaLibraryNext`), which Expo Go does NOT bundle —
 *    importing it crashes the whole app at startup (route eager-loading).
 *  - It is lazily `require`d so that even if the module were missing, the
 *    failure degrades to a toast at download time instead of a boot crash.
 */

type MediaLibraryModule = typeof import('expo-media-library/legacy');

let mediaLibraryModule: MediaLibraryModule | null = null;

function getMediaLibrary(): MediaLibraryModule {
  if (!mediaLibraryModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mediaLibraryModule = require('expo-media-library/legacy') as MediaLibraryModule;
  }
  return mediaLibraryModule;
}

export interface DownloadRequest {
  url: string;
  /** Display name — sanitized; ".mp4" appended when missing. */
  filename: string;
  token: string;
  onProgress?: (fraction: number) => void;
}

export interface DownloadHandle {
  promise: Promise<void>;
  cancel: () => Promise<void>;
}

function sanitizeFilename(name: string, extension = 'mp4'): string {
  const cleaned = name.replace(/[^\w\- ]/g, '').trim().replace(/\s+/g, '-');
  const base = cleaned.length > 0 ? cleaned.slice(0, 60) : `file-${Date.now()}`;
  return base.toLowerCase().endsWith(`.${extension}`) ? base : `${base}.${extension}`;
}

async function ensureGalleryPermission(): Promise<void> {
  const mediaLibrary = getMediaLibrary();
  const current = await mediaLibrary.getPermissionsAsync();
  if (current.granted) return;
  const requested = await mediaLibrary.requestPermissionsAsync();
  if (!requested.granted) {
    throw new Error('Gallery permission denied — allow media access to save videos.');
  }
}

export function downloadVideoToGallery(request: DownloadRequest): DownloadHandle {
  const target = `${FileSystem.cacheDirectory}${sanitizeFilename(request.filename)}`;

  const resumable = FileSystem.createDownloadResumable(
    request.url,
    target,
    { headers: { Authorization: `Bearer ${request.token}` } },
    (progress) => {
      if (progress.totalBytesExpectedToWrite > 0) {
        request.onProgress?.(
          progress.totalBytesWritten / progress.totalBytesExpectedToWrite,
        );
      }
    },
  );

  const promise = (async () => {
    await ensureGalleryPermission();
    const result = await resumable.downloadAsync();
    if (!result || result.status !== 200) {
      throw new Error(`Download failed (${result?.status ?? 'network error'})`);
    }
    await getMediaLibrary().saveToLibraryAsync(result.uri);
    await FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => undefined);
  })();

  return {
    promise,
    cancel: async () => {
      await resumable.pauseAsync().catch(() => undefined);
      await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => undefined);
    },
  };
}

/**
 * Authenticated captions (.srt) download → system share/save sheet.
 *
 * MediaLibrary only accepts media (photo/video/audio), so a text subtitle
 * file can't go to the gallery. Instead we download to the app cache and
 * hand it to the OS share sheet ("Save to Files", Drive, a video editor,
 * ...). expo-sharing ships inside Expo Go, so a static import is safe.
 */
export async function downloadCaptionsAndShare(
  request: Omit<DownloadRequest, 'onProgress'>,
): Promise<void> {
  const Sharing = await import('expo-sharing');
  const target = `${FileSystem.cacheDirectory}${sanitizeFilename(request.filename, 'srt')}`;
  const result = await FileSystem.downloadAsync(request.url, target, {
    headers: { Authorization: `Bearer ${request.token}` },
  });
  if (result.status !== 200) {
    await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => undefined);
    throw new Error(`Download failed (${result.status})`);
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType: 'application/x-subrip',
      dialogTitle: 'Save captions (.srt)',
    });
  }
}

