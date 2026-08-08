/** Thrown for permanent failures (video unavailable/private/removed) — no retry. */
export class SourceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceNotFoundError';
  }
}

/** stderr patterns that indicate the video itself is gone/unreachable. */
const PERMANENT_PATTERNS = [
  /video unavailable/i,
  /private video/i,
  /this video is not available/i,
  /this video has been removed/i,
  /account associated with this video has been terminated/i,
  /who has blocked it/i,
  /copyright/i,
];

export function isPermanentYtDlpFailure(stderr: string): boolean {
  return PERMANENT_PATTERNS.some((pattern) => pattern.test(stderr));
}
