import type { SourceType } from '../../../generated/prisma/client.js';

export const VIDEO_SOURCE_PROVIDERS = Symbol('VIDEO_SOURCE_PROVIDERS');

export interface SourceVideoDetails {
  sourceVideoId: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  durationSeconds: number | null;
  channelName: string | null;
  /** Provider-specific raw metadata, persisted to Project.sourceInfo. */
  raw: Record<string, unknown>;
}

/**
 * A downloadable/transcribable video source (YouTube today; Twitch,
 * direct upload, ... tomorrow). Add a provider class, register it in
 * SourcesModule with the VIDEO_SOURCE_PROVIDERS multi-token — done.
 */
export interface VideoSourceProvider {
  readonly type: SourceType;

  /** Cheap URL check, no network. */
  supports(url: string): boolean;

  /**
   * Fetch title/thumbnail/description/etc.
   * Returns null when the video does not exist / is unavailable
   * (permanent). Throws on transient errors (retryable).
   */
  getDetails(url: string): Promise<SourceVideoDetails | null>;

  /**
   * Download subtitles into destDir.
   * Returns the absolute path of the produced .vtt file, or null when the
   * video has no subtitles.
   */
  downloadSubtitles(url: string, destDir: string): Promise<string | null>;

  /** Download the full video (highest quality mp4) to outputPath. */
  downloadVideo(url: string, outputPath: string): Promise<void>;
}
