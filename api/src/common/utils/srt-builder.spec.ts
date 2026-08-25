import { describe, expect, it } from 'vitest';
import { buildClipSrt } from './srt-builder.js';
import type { TranscriptCue } from './vtt-parser.js';

const CUES: TranscriptCue[] = [
  { startSeconds: 0, endSeconds: 2.5, text: 'Intro before the clip' },
  { startSeconds: 10, endSeconds: 12.5, text: 'First line inside' },
  { startSeconds: 12.5, endSeconds: 15, text: 'Second line inside' },
  { startSeconds: 29, endSeconds: 31, text: 'Crossing the clip end' },
  { startSeconds: 40, endSeconds: 42, text: 'After the clip' },
];

describe('buildClipSrt', () => {
  it('keeps only overlapping cues and shifts timings to clip-relative zero', () => {
    const srt = buildClipSrt(CUES, 10, 30);
    expect(srt).toBe(
      '1\n00:00:00,000 --> 00:00:02,500\nFirst line inside\n\n' +
        '2\n00:00:02,500 --> 00:00:05,000\nSecond line inside\n\n' +
        '3\n00:00:19,000 --> 00:00:20,000\nCrossing the clip end',
    );
  });

  it('clamps cues that start before the clip to 00:00:00,000', () => {
    const srt = buildClipSrt(CUES, 1, 30);
    expect(srt.startsWith('1\n00:00:00,000 --> 00:00:01,500\nIntro')).toBe(true);
  });

  it('excludes cues that only touch the clip boundary', () => {
    // cue ending exactly at start / starting exactly at end must not appear
    const cues: TranscriptCue[] = [
      { startSeconds: 8, endSeconds: 10, text: 'Ends at clip start' },
      { startSeconds: 30, endSeconds: 32, text: 'Starts at clip end' },
    ];
    expect(buildClipSrt(cues, 10, 30)).toBe('');
  });

  it('returns an empty string when nothing overlaps', () => {
    expect(buildClipSrt(CUES, 100, 110)).toBe('');
  });

  it('formats fractional seconds with comma millis', () => {
    const cues: TranscriptCue[] = [
      { startSeconds: 5.25, endSeconds: 6.75, text: 'Fractional' },
    ];
    const srt = buildClipSrt(cues, 5, 10);
    expect(srt).toBe('1\n00:00:00,250 --> 00:00:01,750\nFractional');
  });

  it('keeps hours for clips starting far into the source', () => {
    const cues: TranscriptCue[] = [
      { startSeconds: 3600.5, endSeconds: 3602, text: 'One hour in' },
    ];
    // clip starts at 3599 → cue is 1.5s into the clip
    const srt = buildClipSrt(cues, 3599, 3660);
    expect(srt).toBe('1\n00:00:01,500 --> 00:00:03,000\nOne hour in');
  });
});
