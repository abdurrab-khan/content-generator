import { describe, expect, it } from 'vitest';
import type { TranscriptCue } from '../../common/utils/vtt-parser.js';
import { ChunkingService } from './chunking.service.js';

/** Build cues: one 5s cue every 5 seconds for `durationSeconds`. */
function makeCues(durationSeconds: number): TranscriptCue[] {
  const cues: TranscriptCue[] = [];
  for (let start = 0; start < durationSeconds; start += 5) {
    cues.push({ startSeconds: start, endSeconds: start + 5, text: `cue at ${start}` });
  }
  return cues;
}

// ChunkingService only reads two config keys — fake it instead of booting Nest.
const fakeConfig = {
  get: (key: string) => (key === 'CHUNK_MINUTES' ? 9 : 30),
} as never;

describe('ChunkingService', () => {
  const service = new ChunkingService(fakeConfig);

  it('produces one chunk for short transcripts', () => {
    const chunks = service.chunkCues(makeCues(8 * 60)); // 8 minutes
    expect(chunks).toHaveLength(1);
    expect(chunks[0].index).toBe(0);
    expect(chunks[0].startSeconds).toBe(0);
    expect(chunks[0].endSeconds).toBe(8 * 60);
  });

  it('chunks long transcripts with overlap', () => {
    const chunks = service.chunkCues(makeCues(60 * 60), 9 * 60, 30); // 1h
    // step = 510s -> ceil(3600/510) = 8 windows
    expect(chunks.length).toBeGreaterThanOrEqual(7);
    for (let i = 1; i < chunks.length; i++) {
      const overlap = chunks[i - 1].endSeconds - chunks[i].startSeconds;
      expect(overlap).toBe(30);
    }
    expect(chunks[chunks.length - 1].endSeconds).toBe(3600);
  });

  it('formats chunk text with absolute [HH:MM:SS] line prefixes', () => {
    const chunks = service.chunkCues(makeCues(60));
    expect(chunks[0].text).toContain('[00:00:00] cue at 0');
    expect(chunks[0].text).toContain('[00:00:55] cue at 55');
  });

  it('returns no chunks for empty input', () => {
    expect(service.chunkCues([])).toEqual([]);
  });
});
