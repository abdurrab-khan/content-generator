import { useCallback, useRef, useState } from 'react';
import { getAuthToken } from '../api/http';
import { toast } from '../store/toast-store';
import { downloadVideoToGallery, type DownloadHandle } from './download';

/**
 * Shared download behavior for clip/video/raw-video cards — tracks progress
 * (0..1) or null when idle, toasts the outcome.
 */
export function useMediaDownload() {
  const [progress, setProgress] = useState<number | null>(null);
  const handleRef = useRef<DownloadHandle | null>(null);

  const start = useCallback(
    async (url: string, filename: string) => {
      if (progress !== null) return;
      const token = getAuthToken();
      if (!token) {
        toast.error('You are not signed in');
        return;
      }
      setProgress(0);
      const handle = downloadVideoToGallery({
        url,
        filename,
        token,
        onProgress: (fraction) => setProgress(fraction),
      });
      handleRef.current = handle;
      try {
        await handle.promise;
        toast.success('Saved to gallery');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Download failed');
      } finally {
        setProgress(null);
        handleRef.current = null;
      }
    },
    [progress],
  );

  return { progress, downloading: progress !== null, start };
}
