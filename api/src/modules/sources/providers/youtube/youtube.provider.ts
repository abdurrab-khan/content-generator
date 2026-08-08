import { Injectable, Logger } from '@nestjs/common';
import { SourceType } from '../../../../generated/prisma/client.js';
import type {
  SourceVideoDetails,
  VideoSourceProvider,
} from '../../interfaces/video-source-provider.interface.js';
import { SourceNotFoundError } from '../../ytdlp/yt-dlp.errors.js';
import { YtDlpService } from '../../ytdlp/yt-dlp.service.js';

export const YOUTUBE_URL_PATTERNS = [
  /^https?:\/\/(www\.)?youtube\.com\/watch/i,
  /^https?:\/\/youtu\.be\//i,
  /^https?:\/\/(www\.)?youtube\.com\/shorts\//i,
  /^https?:\/\/(www\.)?youtube\.com\/live\//i,
  /^https?:\/\/m\.youtube\.com\//i,
];

@Injectable()
export class YoutubeProvider implements VideoSourceProvider {
  readonly type = SourceType.YOUTUBE;
  private readonly logger = new Logger(YoutubeProvider.name);

  constructor(private readonly ytdlp: YtDlpService) {}

  supports(url: string): boolean {
    return YOUTUBE_URL_PATTERNS.some((pattern) => pattern.test(url));
  }

  async getDetails(url: string): Promise<SourceVideoDetails | null> {
    let info: Record<string, unknown>;
    try {
      info = await this.ytdlp.dumpJson(url);
    } catch (error) {
      if (error instanceof SourceNotFoundError) return null;
      throw error;
    }

    return {
      sourceVideoId: String(info.id ?? ''),
      title: String(info.title ?? 'Untitled'),
      description: (info.description as string | undefined) ?? null,
      thumbnail: (info.thumbnail as string | undefined) ?? null,
      durationSeconds:
        typeof info.duration === 'number' ? info.duration : null,
      channelName:
        (info.channel as string | undefined) ??
        (info.uploader as string | undefined) ??
        null,
      raw: {
        id: info.id,
        title: info.title,
        duration: info.duration,
        channel: info.channel ?? info.uploader,
        upload_date: info.upload_date,
        view_count: info.view_count,
        like_count: info.like_count,
        categories: info.categories,
        tags: info.tags,
      },
    };
  }

  async downloadSubtitles(url: string, destDir: string): Promise<string | null> {
    this.logger.log(`Fetching subtitles for ${url}`);
    return this.ytdlp.downloadSubtitles(url, destDir);
  }

  async downloadVideo(url: string, outputPath: string): Promise<void> {
    this.logger.log(`Downloading video ${url} -> ${outputPath}`);
    await this.ytdlp.downloadVideo(url, outputPath);
  }
}
