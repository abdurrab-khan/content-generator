import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execa } from 'execa';
import { execFailureMessage } from '../../../common/utils/process.utils.js';
import type { Env } from '../../../config/env.schema.js';
import {
  isPermanentYtDlpFailure,
  SourceNotFoundError,
} from './yt-dlp.errors.js';

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000; // downloads of 3h podcasts can be slow
const DETAILS_TIMEOUT_MS = 60 * 1000;

/**
 * Thin wrapper around the yt-dlp binary. We deliberately shell out instead
 * of using an npm wrapper package: full flag control, no stale dependency,
 * and the same surface can later drive Twitch/downloaders of any kind.
 */
@Injectable()
export class YtDlpService {
  private readonly logger = new Logger(YtDlpService.name);
  private readonly binaryPath: string;

  constructor(config: ConfigService<Env, true>) {
    this.binaryPath = config.get('YTDLP_PATH', { infer: true });
  }

  async getVersion(): Promise<string> {
    const { stdout } = await execa(this.binaryPath, ['--version'], {
      timeout: DETAILS_TIMEOUT_MS,
    });
    return stdout.trim();
  }

  /** `--dump-single-json --skip-download` — full metadata without downloading. */
  async dumpJson(url: string): Promise<Record<string, unknown>> {
    const stdout = await this.run(
      [
        '--dump-single-json',
        '--skip-download',
        '--no-warnings',
        '--no-playlist',
        url,
      ],
      DETAILS_TIMEOUT_MS,
    );
    return JSON.parse(stdout) as Record<string, unknown>;
  }

  /**
   * Download manual subs, falling back to auto-generated subs (vtt).
   * Returns the produced .vtt path, or null when the video has none.
   */
  async downloadSubtitles(
    url: string,
    destDir: string,
  ): Promise<string | null> {
    const outputTemplate = path.join(destDir, 'transcript.%(ext)s');
    const args = [
      '--write-subs',
      '--write-auto-subs',
      '--sub-langs',
      'en.*,en',
      '--sub-format',
      'vtt/srt/best',
      '--convert-subs',
      'vtt',
      '--skip-download',
      '--no-warnings',
      '--no-playlist',
      '-o',
      outputTemplate,
      url,
    ];

    try {
      await this.run(args, DEFAULT_TIMEOUT_MS);
    } catch (error) {
      // yt-dlp exits non-zero when no subtitles exist at all
      if (
        error instanceof Error &&
        /no subtitles|unable to download video subtitles/i.test(String(error))
      ) {
        return null;
      }
      throw error;
    }

    const vtts = (await readdir(destDir)).filter((file) =>
      file.endsWith('.vtt'),
    );
    if (vtts.length === 0) return null;
    // Prefer manual subs over auto-generated when both exist
    const preferred = vtts.find((file) => !file.includes('.en-')) ?? vtts[0];
    return path.join(destDir, preferred);
  }

  /** Highest-quality mp4 download (best video + best audio, merged). */
  async downloadVideo(url: string, outputPath: string): Promise<void> {
    await this.run(
      [
        '-f',
        'bv*+ba/b',
        '--merge-output-format',
        'mp4',
        '--no-playlist',
        '--no-warnings',
        '-o',
        outputPath,
        url,
      ],
      DEFAULT_TIMEOUT_MS * 6, // very large files
    );
  }

  private async run(args: string[], timeoutMs: number): Promise<string> {
    try {
      const { stdout } = await execa(this.binaryPath, args, {
        timeout: timeoutMs,
      });
      return stdout;
    } catch (error) {
      const stderr = execFailureMessage(error);
      const firstLine =
        stderr.split('\n').find((line) => line.trim().length > 0) ??
        'unknown error';
      if (isPermanentYtDlpFailure(stderr)) {
        throw new SourceNotFoundError(firstLine);
      }
      this.logger.error(`yt-dlp failed: ${firstLine}`);
      throw new Error(`yt-dlp failed: ${firstLine}`);
    }
  }
}
