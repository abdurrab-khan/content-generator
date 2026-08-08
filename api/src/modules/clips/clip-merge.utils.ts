/**
 * Cross-chunk dedupe of clip candidates. Chunks overlap by design, so the
 * same moment can be reported by two adjacent chunks. Pure & unit-tested.
 */

export interface ClipDedupeInput {
  id: string;
  start: number;
  end: number;
  viralityScore: number;
  chunkIndex: number;
}

function overlapRatio(a: ClipDedupeInput, b: ClipDedupeInput): number {
  const overlap = Math.min(a.end, b.end) - Math.max(a.start, b.start);
  if (overlap <= 0) return 0;
  const shorter = Math.min(a.end - a.start, b.end - b.start);
  return shorter <= 0 ? 0 : overlap / shorter;
}

function isDuplicate(a: ClipDedupeInput, b: ClipDedupeInput, toleranceSeconds: number): boolean {
  const edgesAlign =
    Math.abs(a.start - b.start) <= toleranceSeconds &&
    Math.abs(a.end - b.end) <= toleranceSeconds;
  return edgesAlign || overlapRatio(a, b) > 0.6;
}

/**
 * Returns the ids of clips to drop. For each duplicate pair the higher
 * virality score wins; ties go to the earlier chunk.
 */
export function findDuplicateClipIds(
  clips: ClipDedupeInput[],
  toleranceSeconds = 5,
): string[] {
  const sorted = [...clips].sort(
    (a, b) => b.viralityScore - a.viralityScore || a.chunkIndex - b.chunkIndex,
  );
  const dropped = new Set<string>();

  for (let i = 0; i < sorted.length; i++) {
    const winner = sorted[i];
    if (dropped.has(winner.id)) continue;
    for (let j = i + 1; j < sorted.length; j++) {
      const candidate = sorted[j];
      if (dropped.has(candidate.id)) continue;
      if (isDuplicate(winner, candidate, toleranceSeconds)) {
        dropped.add(candidate.id);
      }
    }
  }

  return [...dropped];
}
