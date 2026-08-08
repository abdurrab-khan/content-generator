/**
 * Timestamp helpers.
 *
 * Canonical formats:
 *  - "HH:MM:SS" or "MM:SS" (optionally with .mmm / ,mmm millis) — LLM friendly
 *  - seconds (number) — storage & ffmpeg friendly
 */

const TIMESTAMP_REGEX =
  /^(?:(\d{1,3}):)?([0-5]?\d):([0-5]?\d)(?:[.,](\d{1,3}))?$/;

/** Parse "HH:MM:SS(.mmm)" / "MM:SS(.mmm)" into seconds. Throws on invalid input. */
export function timestampToSeconds(timestamp: string): number {
  const match = TIMESTAMP_REGEX.exec(timestamp.trim());
  if (!match) {
    throw new Error(`Invalid timestamp: "${timestamp}"`);
  }
  const hours = match[1] ? Number.parseInt(match[1], 10) : 0;
  const minutes = Number.parseInt(match[2], 10);
  const seconds = Number.parseInt(match[3], 10);
  const millis = match[4] ? Number.parseInt(match[4].padEnd(3, '0'), 10) : 0;
  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}

/** Like {@link timestampToSeconds} but returns null instead of throwing. */
export function tryTimestampToSeconds(timestamp: string): number | null {
  try {
    return timestampToSeconds(timestamp);
  } catch {
    return null;
  }
}

/** Format seconds as "HH:MM:SS". */
export function secondsToTimestamp(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** Format seconds for ffmpeg/yt-dlp CLI args ("123.5"). */
export function secondsToFfmpegArg(seconds: number): string {
  return (Math.round(seconds * 1000) / 1000).toString();
}
