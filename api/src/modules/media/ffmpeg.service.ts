import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execa } from 'execa';
import { execFailureMessage } from '../../common/utils/process.utils.js';
import { secondsToFfmpegArg } from '../../common/utils/time.utils.js';
import type { Env } from '../../config/env.schema.js';

export interface CutClipOptions {
  inputPath: string;
  outputPath: string;
  startSeconds: number;
  endSeconds: number;
  /**
   * precise (default): re-encode, frame-accurate cuts.
   * fast: stream copy, near-instant but snaps to keyframes.
   */
  precise?: boolean;
}

export interface ApplyFilterGraphOptions {
  inputPath: string;
  outputPath: string;
  /**
   * Raw FFmpeg video filter chain (-vf), e.g.
   * "curves=all='0/0 0.25/0.20 1/1',eq=contrast=1.18:saturation=1.18".
   * Passed as a single execa arg — no shell, commas/quotes are safe.
   */
  filterGraph: string;
}

/** Thin execa-based FFmpeg wrapper (fluent-ffmpeg is deprecated). */
@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);
  private readonly ffmpegPath: string;
  private readonly ffprobePath: string;

  constructor(config: ConfigService<Env, true>) {
    this.ffmpegPath = config.get('FFMPEG_PATH', { infer: true });
    this.ffprobePath = config.get('FFPROBE_PATH', { infer: true });
  }

  async getVersion(): Promise<string> {
    const { stdout } = await execa(this.ffmpegPath, ['-version']);
    return stdout.split('\n')[0] ?? 'unknown';
  }

  async probeDurationSeconds(inputPath: string): Promise<number> {
    const { stdout } = await execa(this.ffprobePath, [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      inputPath,
    ]);
    const duration = Number.parseFloat(stdout.trim());
    if (Number.isNaN(duration)) {
      throw new Error(`ffprobe returned invalid duration for ${inputPath}`);
    }
    return duration;
  }

  async cutClip(options: CutClipOptions): Promise<void> {
    const {
      inputPath,
      outputPath,
      startSeconds,
      endSeconds,
      precise = true,
    } = options;
    if (endSeconds <= startSeconds) {
      throw new Error(`Invalid clip range: ${startSeconds}..${endSeconds}`);
    }

    const args = precise
      ? [
          '-hide_banner',
          '-loglevel',
          'error',
          '-ss',
          secondsToFfmpegArg(startSeconds),
          '-to',
          secondsToFfmpegArg(endSeconds),
          '-i',
          inputPath,
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-crf',
          '18',
          '-c:a',
          'aac',
          '-movflags',
          '+faststart',
          '-y',
          outputPath,
        ]
      : [
          '-hide_banner',
          '-loglevel',
          'error',
          '-ss',
          secondsToFfmpegArg(startSeconds),
          '-to',
          secondsToFfmpegArg(endSeconds),
          '-i',
          inputPath,
          '-c',
          'copy',
          '-y',
          outputPath,
        ];

    try {
      await execa(this.ffmpegPath, args);
      this.logger.log(
        `Cut ${secondsToFfmpegArg(startSeconds)}-${secondsToFfmpegArg(endSeconds)} -> ${outputPath}`,
      );
    } catch (error) {
      throw new Error(`ffmpeg cut failed: ${execFailureMessage(error)}`);
    }
  }

  /**
   * Re-encodes a video through a raw filter chain (color grading, and later
   * any video effect). Audio is copied through untouched.
   */
  async applyFilterGraph(options: ApplyFilterGraphOptions): Promise<void> {
    const { inputPath, outputPath, filterGraph } = options;
    if (!filterGraph.trim()) {
      throw new Error('Filter graph must not be empty');
    }

    const args = [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      inputPath,
      '-vf',
      filterGraph,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '18',
      '-c:a',
      'copy',
      '-movflags',
      '+faststart',
      '-y',
      outputPath,
    ];

    try {
      await execa(this.ffmpegPath, args);
      this.logger.log(`Applied filter graph -> ${outputPath}`);
    } catch (error) {
      throw new Error(
        `ffmpeg filter graph failed: ${execFailureMessage(error)}`,
      );
    }
  }
}
