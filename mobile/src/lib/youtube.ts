/**
 * Client-side YouTube URL validation for instant feedback.
 * The server re-validates (and supports more providers later) — this is only
 * a UX gate, intentionally permissive across watch/shorts/live/youtu.be.
 */
const YOUTUBE_URL_PATTERN =
  /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?[^\s]*v=|shorts\/|live\/)|youtu\.be\/)[\w-]{6,}/i;

export function isValidYouTubeUrl(url: string): boolean {
  return YOUTUBE_URL_PATTERN.test(url.trim());
}

/** Extract a video id when possible (for display purposes only). */
export function extractYouTubeId(url: string): string | null {
  const match =
    url.trim().match(/[?&]v=([\w-]{6,})/) ??
    url.trim().match(/(?:shorts\/|live\/|youtu\.be\/)([\w-]{6,})/);
  return match?.[1] ?? null;
}
