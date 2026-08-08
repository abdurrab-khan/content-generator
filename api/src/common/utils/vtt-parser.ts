import { tryTimestampToSeconds } from './time.utils.js';

export interface TranscriptCue {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

const BLOCK_SEPARATOR = /\n\s*\n/;
const TIMING_LINE_REGEX = /^(\S+)\s+-->\s+(\S+)(?:\s+.*)?$/;
const SKIP_BLOCK_PREFIXES = ['WEBVTT', 'NOTE', 'STYLE', 'REGION'];

/** Decode the handful of HTML entities YouTube puts in captions. */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Remove markup from a cue text line:
 *  - karaoke timestamps "<00:00:01.500>"
 *  - tags "<c>...</c>", "<i>", "</c>" etc.
 */
function stripCueMarkup(text: string): string {
  return decodeEntities(
    text
      .replace(/<\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}>/g, '')
      .replace(/<\/?[a-zA-Z][^>]*>/g, ''),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Minimal WebVTT parser tuned for yt-dlp subtitle output.
 * Consecutive duplicate cue texts (YouTube auto-sub "rolling" artifacts)
 * are collapsed.
 */
export function parseVtt(content: string): TranscriptCue[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/^\uFEFF/, '');
  const blocks = normalized.split(BLOCK_SEPARATOR);
  const cues: TranscriptCue[] = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;
    if (SKIP_BLOCK_PREFIXES.some((prefix) => lines[0].startsWith(prefix))) continue;

    const timingLineIndex = lines.findIndex((line) => TIMING_LINE_REGEX.test(line));
    if (timingLineIndex === -1) continue;

    const timing = TIMING_LINE_REGEX.exec(lines[timingLineIndex]);
    if (!timing) continue;
    const startSeconds = tryTimestampToSeconds(timing[1]);
    const endSeconds = tryTimestampToSeconds(timing[2]);
    if (startSeconds === null || endSeconds === null) continue;

    const text = stripCueMarkup(lines.slice(timingLineIndex + 1).join(' '));
    if (!text) continue;

    const previous = cues[cues.length - 1];
    if (previous && previous.text === text) continue;

    cues.push({ startSeconds, endSeconds, text });
  }

  return cues;
}
