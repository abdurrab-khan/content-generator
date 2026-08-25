import type { TranscriptCue } from './vtt-parser.js';

/**
 * Build a SubRip (.srt) document for a clip cut out of a longer transcript.
 *
 * Only cues overlapping `[startSeconds, endSeconds)` are kept; their timings
 * are shifted so the clip starts at 00:00:00,000 (players expect captions
 * relative to the clip, not the source video). Cue boundaries are clamped to
 * the clip range.
 */
export function buildClipSrt(
  cues: TranscriptCue[],
  startSeconds: number,
  endSeconds: number,
): string {
  const overlapping = cues.filter(
    (cue) => cue.endSeconds > startSeconds && cue.startSeconds < endSeconds,
  );

  return overlapping
    .map((cue, index) => {
      const shiftedStart = Math.max(0, cue.startSeconds - startSeconds);
      const shiftedEnd =
        Math.min(endSeconds, cue.endSeconds) - startSeconds;
      return (
        `${index + 1}\n` +
        `${secondsToSrtTimestamp(shiftedStart)} --> ` +
        `${secondsToSrtTimestamp(shiftedEnd)}\n` +
        `${cue.text}`
      );
    })
    .join('\n\n');
}

/** Format seconds as SRT timestamp "HH:MM:SS,mmm" (comma decimal separator). */
function secondsToSrtTimestamp(totalSeconds: number): string {
  // Work in whole millis so rounding (e.g. x.9996s) can't produce ",1000".
  const totalMillis = Math.max(0, Math.round(totalSeconds * 1000));
  const hours = Math.floor(totalMillis / 3_600_000);
  const minutes = Math.floor((totalMillis % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMillis % 60_000) / 1000);
  const millis = totalMillis % 1000;
  const pad = (value: number, length = 2) =>
    String(value).padStart(length, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}
