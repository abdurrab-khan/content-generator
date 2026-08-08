import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { secondsToTimestamp } from '../../common/utils/time.utils.js';
import type { TranscriptCue } from '../../common/utils/vtt-parser.js';
import type { Env } from '../../config/env.schema.js';

export interface TranscriptChunk {
  index: number;
  startSeconds: number;
  endSeconds: number;
  /** Cue lines formatted "[HH:MM:SS] text" — the LLM cites absolute times. */
  text: string;
}

/**
 * Splits transcript cues into ~CHUNK_MINUTES windows with a small overlap
 * so viral moments spanning a boundary are never sliced in half.
 * Overlapping clip candidates are deduplicated later (fan-in merge).
 */
@Injectable()
export class ChunkingService {
  private readonly chunkSeconds: number;
  private readonly overlapSeconds: number;

  constructor(config: ConfigService<Env, true>) {
    this.chunkSeconds = config.get('CHUNK_MINUTES', { infer: true }) * 60;
    this.overlapSeconds = config.get('CHUNK_OVERLAP_SECONDS', { infer: true });
  }

  chunkCues(
    cues: TranscriptCue[],
    chunkSeconds = this.chunkSeconds,
    overlapSeconds = this.overlapSeconds,
  ): TranscriptChunk[] {
    if (cues.length === 0) return [];

    const lastCueEnd = Math.max(...cues.map((cue) => cue.endSeconds));
    const step = Math.max(1, chunkSeconds - overlapSeconds);
    const chunks: TranscriptChunk[] = [];

    let index = 0;
    for (let windowStart = 0; windowStart < lastCueEnd; windowStart += step) {
      const windowEnd = Math.min(windowStart + chunkSeconds, lastCueEnd);
      const windowCues = cues.filter(
        (cue) => cue.startSeconds < windowEnd && cue.endSeconds > windowStart,
      );
      if (windowCues.length === 0) continue;

      chunks.push({
        index: index++,
        startSeconds: windowStart,
        endSeconds: windowEnd,
        text: this.formatChunkText(windowCues),
      });

      if (windowEnd >= lastCueEnd) break;
    }

    return chunks;
  }

  private formatChunkText(cues: TranscriptCue[]): string {
    return cues
      .map((cue) => `[${secondsToTimestamp(cue.startSeconds)}] ${cue.text}`)
      .join('\n');
  }
}
