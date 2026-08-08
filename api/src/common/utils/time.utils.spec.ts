import { describe, expect, it } from 'vitest';
import {
  secondsToFfmpegArg,
  secondsToTimestamp,
  timestampToSeconds,
  tryTimestampToSeconds,
} from './time.utils.js';

describe('timestampToSeconds', () => {
  it('parses HH:MM:SS', () => {
    expect(timestampToSeconds('01:02:03')).toBe(3723);
    expect(timestampToSeconds('00:00:00')).toBe(0);
  });

  it('parses MM:SS', () => {
    expect(timestampToSeconds('09:30')).toBe(570);
  });

  it('parses millis with dot or comma', () => {
    expect(timestampToSeconds('00:00:01.500')).toBe(1.5);
    expect(timestampToSeconds('00:00:01,500')).toBe(1.5);
  });

  it('parses long-hour timestamps (3h podcasts)', () => {
    expect(timestampToSeconds('02:59:59')).toBe(10799);
  });

  it('throws on invalid input', () => {
    expect(() => timestampToSeconds('nope')).toThrow();
    expect(() => timestampToSeconds('1:99:99')).toThrow();
  });
});

describe('tryTimestampToSeconds', () => {
  it('returns null instead of throwing', () => {
    expect(tryTimestampToSeconds('garbage')).toBeNull();
    expect(tryTimestampToSeconds('00:10:00')).toBe(600);
  });
});

describe('secondsToTimestamp', () => {
  it('formats round-trip values', () => {
    expect(secondsToTimestamp(3723)).toBe('01:02:03');
    expect(secondsToTimestamp(0)).toBe('00:00:00');
  });

  it('clamps negatives and floors fractions', () => {
    expect(secondsToTimestamp(-5)).toBe('00:00:00');
    expect(secondsToTimestamp(1.9)).toBe('00:00:01');
  });
});

describe('secondsToFfmpegArg', () => {
  it('keeps millis precision', () => {
    expect(secondsToFfmpegArg(1.5)).toBe('1.5');
    expect(secondsToFfmpegArg(570)).toBe('570');
  });
});
