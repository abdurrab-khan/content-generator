import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckError, type HealthIndicatorResult } from '@nestjs/terminus';
import { Redis } from 'ioredis';
import type { Env } from '../config/env.schema.js';
import { PrismaService } from '../database/prisma.service.js';
import { FfmpegService } from '../modules/media/ffmpeg.service.js';
import { YtDlpService } from '../modules/sources/ytdlp/yt-dlp.service.js';

@Injectable()
export class DatabaseHealthIndicator {
  constructor(private readonly prisma: PrismaService) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { [key]: { status: 'up' } };
    } catch (error) {
      throw new HealthCheckError('Database check failed', {
        [key]: { status: 'down', message: error instanceof Error ? error.message : 'unknown' },
      });
    }
  }
}

@Injectable()
export class RedisHealthIndicator implements OnModuleDestroy {
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService<Env, true>) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      this.client ??= new Redis({
        host: this.config.get('REDIS_HOST', { infer: true }),
        port: this.config.get('REDIS_PORT', { infer: true }),
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // fail fast for health checks
        lazyConnect: true,
      });
      await this.client.connect().catch(() => undefined);
      await this.client.ping();
      return { [key]: { status: 'up' } };
    } catch (error) {
      throw new HealthCheckError('Redis check failed', {
        [key]: { status: 'down', message: error instanceof Error ? error.message : 'unknown' },
      });
    }
  }

  onModuleDestroy(): void {
    this.client?.disconnect();
    this.client = null;
  }
}

const BINARIES_CACHE_MS = 60_000;

@Injectable()
export class BinariesHealthIndicator {
  private cache: { at: number; result: HealthIndicatorResult } | null = null;

  constructor(
    private readonly ytdlp: YtDlpService,
    private readonly ffmpeg: FfmpegService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    if (this.cache && Date.now() - this.cache.at < BINARIES_CACHE_MS) {
      return this.cache.result;
    }
    try {
      const [ytdlpVersion, ffmpegVersion] = await Promise.all([
        this.ytdlp.getVersion(),
        this.ffmpeg.getVersion(),
      ]);
      const result: HealthIndicatorResult = {
        [key]: { status: 'up', 'yt-dlp': ytdlpVersion, ffmpeg: ffmpegVersion },
      };
      this.cache = { at: Date.now(), result };
      return result;
    } catch (error) {
      throw new HealthCheckError('Binaries check failed', {
        [key]: {
          status: 'down',
          message: error instanceof Error ? error.message : 'unknown',
          hint: 'Install yt-dlp (winget install yt-dlp.yt-dlp) and ffmpeg, or set YTDLP_PATH/FFMPEG_PATH',
        },
      });
    }
  }
}
