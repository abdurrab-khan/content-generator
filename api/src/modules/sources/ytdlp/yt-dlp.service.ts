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
const SEARCH_TIMEOUT_MS = 2 * 60 * 1000; // flat searches are metadata-only

/** One result of a flat YouTube search (`ytsearchN:`), metadata-only. */
export interface YtDlpSearchEntry {
  id: string;
  title: string;
  url: string | null;
  channel: string | null;
  durationSeconds: number | null;
  viewCount: number | null;
  thumbnail: string | null;
}

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

  /**
   * Flat YouTube search. Relevance ranking uses the `ytsearchN:` prefix;
   * date ranking uses the search results URL with the "upload date" sort
   * parameter — YouTube removed date sorting from the internal search API,
   * so yt-dlp dropped the `ytsearchdateN:` prefix, but results URLs still
   * support it (sp=CAI%253D). Metadata-only, no download. Entries carry
   * best-effort stats (views/duration may be null); hydrate promising
   * candidates with `dumpJson` for the full record.
   */
  async searchVideos(
    query: string,
    limit: number,
    sortByDate = false,
  ): Promise<YtDlpSearchEntry[]> {
    // Fetch extra rows: date-sorted results interleave channel cards and
    // shorts, which callers filter out.
    const fetchLimit = limit * 2;
    const target = sortByDate
      ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=CAI%253D`
      : `ytsearch${fetchLimit}:${query}`;
    const stdout = await this.run(
      [
        '--dump-single-json',
        '--flat-playlist',
        '--skip-download',
        '--no-warnings',
        '--playlist-end',
        String(fetchLimit),
        target,
      ],
      SEARCH_TIMEOUT_MS,
    );
    const parsed = JSON.parse(stdout) as { entries?: unknown };
    if (!Array.isArray(parsed.entries)) return [];

    const entries: YtDlpSearchEntry[] = [];
    for (const raw of parsed.entries) {
      if (!raw || typeof raw !== 'object') continue;
      const entry = raw as Record<string, unknown>;
      if (typeof entry.id !== 'string' || entry.id.length === 0) continue;
      // Date-sorted results mix channels/playlists into the list — those
      // carry no duration/viewCount and their URL is not a video watch URL.
      if (entry.url != null && !isVideoUrl(String(entry.url))) continue;
      entries.push({
        id: entry.id,
        title: typeof entry.title === 'string' ? entry.title : 'Untitled',
        url: typeof entry.url === 'string' ? entry.url : null,
        channel:
          (entry.channel as string | undefined) ??
          (entry.uploader as string | undefined) ??
          null,
        durationSeconds:
          typeof entry.duration === 'number' ? entry.duration : null,
        viewCount:
          typeof entry.view_count === 'number' ? entry.view_count : null,
        thumbnail: pickThumbnail(entry),
      });
    }
    return entries;
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

/** Best available thumbnail URL from a yt-dlp entry (largest = last). */
function pickThumbnail(entry: Record<string, unknown>): string | null {
  if (typeof entry.thumbnail === 'string') return entry.thumbnail;
  if (!Array.isArray(entry.thumbnails)) return null;
  const urls = entry.thumbnails
    .map((thumb) =>
      thumb && typeof thumb === 'object'
        ? (thumb as Record<string, unknown>).url
        : null,
    )
    .filter((url): url is string => typeof url === 'string');
  return urls.at(-1) ?? null;
}

/** True for video watch URLs (rejects /channel/, /playlist, /@handle, ...). */
function isVideoUrl(url: string): boolean {
  return /\/watch[?/]|youtu\.be\//.test(url);
}
