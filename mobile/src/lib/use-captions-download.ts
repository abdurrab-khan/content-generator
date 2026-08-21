import { useCallback, useState } from 'react';
import { getAuthToken } from '../api/http';
import { toast } from '../store/toast-store';
import { downloadCaptionsAndShare } from './download';

/**
 * Captions (.srt) download behavior — downloads the authenticated file and
 * opens the OS share/save sheet. Tracks a busy flag and toasts the outcome.
 */
export function useCaptionsDownload() {
  const [downloading, setDownloading] = useState(false);

  const start = useCallback(
    async (url: string, filename: string) => {
      if (downloading) return;
      const token = getAuthToken();
      if (!token) {
        toast.error('You are not signed in');
        return;
      }
      setDownloading(true);
      try {
        await downloadCaptionsAndShare({ url, filename, token });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Download failed');
      } finally {
        setDownloading(false);
      }
    },
    [downloading],
  );

  return { downloading, start };
}
