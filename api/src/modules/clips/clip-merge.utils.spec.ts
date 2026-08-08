import { describe, expect, it } from 'vitest';
import {
  findDuplicateClipIds,
  type ClipDedupeInput,
} from './clip-merge.utils.js';

function clip(
  partial: Partial<ClipDedupeInput> & { id: string },
): ClipDedupeInput {
  return { start: 0, end: 60, viralityScore: 50, chunkIndex: 0, ...partial };
}

describe('findDuplicateClipIds', () => {
  it('drops the lower-scored near-identical clip', () => {
    const dupes = findDuplicateClipIds([
      clip({ id: 'a', start: 100, end: 160, viralityScore: 90, chunkIndex: 0 }),
      clip({ id: 'b', start: 103, end: 162, viralityScore: 70, chunkIndex: 1 }),
    ]);
    expect(dupes).toEqual(['b']);
  });

  it('keeps clips from different moments', () => {
    const dupes = findDuplicateClipIds([
      clip({ id: 'a', start: 100, end: 160, viralityScore: 90 }),
      clip({ id: 'b', start: 500, end: 560, viralityScore: 70 }),
    ]);
    expect(dupes).toEqual([]);
  });

  it('drops the clip mostly contained in a longer winner (overlap ratio)', () => {
    const dupes = findDuplicateClipIds([
      clip({ id: 'long', start: 100, end: 220, viralityScore: 80 }),
      clip({ id: 'short', start: 120, end: 160, viralityScore: 60 }),
    ]);
    expect(dupes).toEqual(['short']);
  });

  it('resolves score ties in favor of the earlier chunk', () => {
    const dupes = findDuplicateClipIds([
      clip({
        id: 'later',
        start: 100,
        end: 160,
        viralityScore: 90,
        chunkIndex: 3,
      }),
      clip({
        id: 'earlier',
        start: 102,
        end: 158,
        viralityScore: 90,
        chunkIndex: 1,
      }),
    ]);
    expect(dupes).toEqual(['later']);
  });

  it('handles clusters: one winner can drop multiple losers', () => {
    const dupes = findDuplicateClipIds([
      clip({ id: 'winner', start: 100, end: 160, viralityScore: 95 }),
      clip({ id: 'l1', start: 101, end: 159, viralityScore: 80 }),
      clip({ id: 'l2', start: 104, end: 161, viralityScore: 60 }),
      clip({ id: 'other', start: 900, end: 960, viralityScore: 99 }),
    ]);
    expect(dupes.sort()).toEqual(['l1', 'l2']);
  });
});
