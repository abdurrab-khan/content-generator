import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  PodcastLanguage,
  PodcastType,
  SourceType,
} from '../../generated/prisma/client.js';
import { ApplicationsService } from '../applications/applications.service.js';
import {
  YtDlpService,
  type YtDlpSearchEntry,
} from '../sources/ytdlp/yt-dlp.service.js';
import type {
  ListPodcastersQuery,
  ListPodcastsQuery,
  NotInterestedDto,
} from './dto/discovery.dto.js';
import {
  podcastersForLanguage,
  type PodcasterEntry,
} from './podcasters.catalog.js';
import { RedisService } from '../../database/redis.service.js';

/** Below this a video is a clip/short, not a podcast episode. */
export const MIN_PODCAST_DURATION_SECONDS = 20 * 60;
/** Flat-search results requested per podcaster. */
const SEARCH_RESULTS_PER_PODCASTER = 6;
/** Best candidates kept per podcaster before hydration. */
const CANDIDATES_PER_PODCASTER = 3;
const PODCASTER_CONCURRENCY = 3;
const HYDRATE_CONCURRENCY = 4;
const USED_KEY = 'used-podcast';
const MARK_NOT_INTERESTED_KEY = 'not-interested-podcast';

/** A podcast suggestion returned to the client. */
export interface DiscoveredPodcastItem {
  id: string;
  url: string;
  title: string;
  sourceType: SourceType;
  sourceVideoId: string;
  thumbnail: string | null;
  channelName: string | null;
  podcasterName: string;
  durationSeconds: number | null;
  viewCount: number | null;
  likeCount: number | null;
  publishedAt: Date | null;
  createdAt: Date;
}

/** Snapshot of a discovered video used to persist a cache row. */
export interface PodcastSnapshot {
  sourceVideoId: string;
  url: string;
  title: string;
  channelName: string | null;
  thumbnail: string | null;
  durationSeconds: number | null;
  viewCount: number | null;
  likeCount: number | null;
  publishedAt: Date | null;
}

/**
 * Podcast discovery: searches YouTube for the curated podcasters of the
 * application's language, keeps only podcast-length videos, and excludes
 * anything already seen — the two cache states (USED / NOT_INTERESTED rows)
 * plus any video the application already has a project for (clips made
 * manually or via discovery).
 *
 * Suggestions themselves are never persisted; only the two "never show
 * again" states are stored.
 */
@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly applications: ApplicationsService,
    private readonly ytdlp: YtDlpService,
  ) {}

  /** Curated podcaster catalog for the application (or an explicit language). */
  async listPodcasters(
    userId: string,
    query: ListPodcastersQuery,
  ): Promise<{ language: PodcastLanguage; podcasters: PodcasterEntry[] }> {
    let language = query.language
      ? PodcastLanguage[query.language]
      : PodcastLanguage.ENGLISH;
    if (query.applicationId) {
      const application = await this.applications.findOwnedOrThrow(
        userId,
        query.applicationId,
      );
      language = application.language;
    }
    return { language, podcasters: podcastersForLanguage(language) };
  }

  /**
   * Get Podcasts from the database, based on the mode either "popular" or "trading" one
   */
  async findPodcasts(
    userId: string,
    query: ListPodcastsQuery,
  ): Promise<{
    items: DiscoveredPodcastItem[];
    language: PodcastLanguage;
    mode: 'popular' | 'trending';
  }> {
    const mode = query.mode;
    const application = await this.applications.findOwnedOrThrow(
      userId,
      query.applicationId,
    );

    const podcasts = await this.prisma.discoveredPodcast.findMany({
      where: {
        applicationId: application.id,
        podcastType: query.mode === 'popular' ? 'POPULAR' : 'TRANDING',
      },
      omit: {
        updatedAt: true,
        podcastType: true,
        applicationId: true,
      },
    });

    return {
      mode: mode,
      items: podcasts,
      language: application.language,
    };
  }

  /**
   * Find podcast episodes: one flat search per podcaster, keep long-form
   * results the user has not seen, hydrate the survivors for views/likes,
   * then rank by mode.
   */
  async refetchPodcasts(userId: string, query: ListPodcastsQuery) {
    const mode =
      query.mode === 'trending' ? PodcastType.TRANDING : PodcastType.POPULAR;
    const application = await this.applications.findOwnedOrThrow(
      userId,
      query.applicationId,
    );

    let podcasters = podcastersForLanguage(application.language);
    if (query.podcasters) {
      const wanted = new Set(
        query.podcasters
          .split(',')
          .map((name) => name.trim().toLowerCase())
          .filter(Boolean),
      );
      podcasters = podcasters.filter((p) => wanted.has(p.name.toLowerCase()));
    }

    // 1. Flat search per podcaster (bounded concurrency) → candidates.
    const searches = await runPool(
      podcasters,
      PODCASTER_CONCURRENCY,
      async (podcaster) => {
        try {
          const entries = await this.ytdlp.searchVideos(
            podcaster.query,
            SEARCH_RESULTS_PER_PODCASTER,
            query.mode === 'trending',
          );
          return { podcaster, entries };
        } catch (error) {
          this.logger.warn(
            `Search failed for "${podcaster.name}": ${error instanceof Error ? error.message : error}`,
          );
          return { podcaster, entries: [] as YtDlpSearchEntry[] };
        }
      },
    );

    // Load all the not-interested, used, already in the project podcasts.
    const excludedPodcasts = await this.loadExcludedPodcasts(application.id);

    // 2. Filter + dedupe: podcast-length, not excluded, first podcaster wins.
    const seen = new Set<string>();
    const candidates: {
      podcaster: PodcasterEntry;
      entry: YtDlpSearchEntry;
    }[] = [];
    for (const { podcaster, entries } of searches) {
      const kept = entries
        .filter(
          (entry) =>
            !excludedPodcasts.has(entry.id) &&
            !seen.has(entry.id) &&
            (entry.durationSeconds === null ||
              entry.durationSeconds === undefined ||
              entry.durationSeconds >= MIN_PODCAST_DURATION_SECONDS),
        )
        .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
        .slice(0, CANDIDATES_PER_PODCASTER);

      for (const entry of kept) {
        seen.add(entry.id);
        candidates.push({ podcaster, entry });
      }
    }

    // 3. Hydrate candidates for full stats (views, likes, upload date).
    const hydrated = await runPool(
      candidates,
      HYDRATE_CONCURRENCY,
      async ({ podcaster, entry }) => {
        return await this.hydrate(podcaster, entry);
      },
    );
    const items = hydrated
      .filter((item) => item !== null)
      .map((d) => ({
        ...d,
        podcastType: mode,
        applicationId: application.id,
        publishedAt: d.publishedAt ? new Date(d.publishedAt) : null,
      }))
      .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
      .slice(0, query.limit);

    // Delete existing podcasts
    if (items.length > 0) {
      await this.prisma.discoveredPodcast.deleteMany({
        where: {
          podcastType: mode,
          applicationId: application.id,
        },
      });
    }

    await this.prisma.discoveredPodcast.createMany({
      data: items,
    });
  }

  /**
   * "Not interested" — persist the snapshot as NOT_INTERESTED so discovery
   * never suggests the video again. A USED row is never downgraded.
   */
  async markNotInterested(userId: string, dto: NotInterestedDto) {
    await this.applications.findOwnedOrThrow(userId, dto.applicationId);

    try {
      await this.redis.sadd(
        `${MARK_NOT_INTERESTED_KEY}-${dto.applicationId}`,
        dto.sourceVideoId,
      );
      await this.prisma.discoveredPodcast.delete({
        // where: {
        //   sourceVideoId: dto.sourceVideoId,
        //   applicationId: dto.applicationId,
        // }
        where: {
          applicationId_sourceVideoId: {
            sourceVideoId: dto.sourceVideoId,
            applicationId: dto.applicationId,
          },
        },
      });
    } catch (err) {
      this.logger.warn(`markNotInterested failed: ${err}`);
    }
  }

  /**
   * Cache hook called whenever a project is created (via discovery or
   * manually with a pasted URL): record the source video as USED so it
   * stays out of future suggestions even if the project is later deleted.
   * Best-effort — never blocks project creation.
   */
  async markUsed(applicationId: string, snapshot: PodcastSnapshot) {
    if (!snapshot.sourceVideoId) return;
    try {
      await this.redis.sadd(
        `${USED_KEY}-${applicationId}`,
        snapshot.sourceVideoId,
      );
      await this.prisma.discoveredPodcast.deleteMany({
        where: {
          applicationId: applicationId,
          sourceVideoId: snapshot.sourceVideoId,
        },
      });
    } catch (err) {
      this.logger.warn(`markUsed failed: ${err}`);
    }
  }

  // -------------------------------------------------------------------------

  /** Videos to never suggest: USED/NOT_INTERESTED rows + existing projects. */
  private async loadExcludedPodcasts(
    applicationId: string,
  ): Promise<Set<string>> {
    const projects = await this.prisma.project.findMany({
      where: { applicationId, sourceVideoId: { not: null } },
      select: { sourceVideoId: true },
    });

    const usedPodcasts = await this.redis.smembers(
      `${USED_KEY}-${applicationId}`,
    );
    const notInterestedPodcasts = await this.redis.smembers(
      `${MARK_NOT_INTERESTED_KEY}-${applicationId}`,
    );

    const excluded = new Set([...usedPodcasts, ...notInterestedPodcasts]);
    for (const project of projects) {
      if (project.sourceVideoId) excluded.add(project.sourceVideoId);
    }

    return excluded;
  }

  /** Full metadata for one candidate; falls back to the flat-search data. */
  private async hydrate(podcaster: PodcasterEntry, entry: YtDlpSearchEntry) {
    const url = entry.url ?? `https://www.youtube.com/watch?v=${entry.id}`;
    let info: Record<string, unknown> | null = null;
    try {
      info = await this.ytdlp.dumpJson(url);
    } catch (error) {
      this.logger.warn(
        `Hydration failed for ${entry.id}: ${error instanceof Error ? error.message : error}`,
      );
    }

    const durationSeconds =
      typeof info?.duration === 'number'
        ? info.duration
        : entry.durationSeconds;
    if (
      durationSeconds !== null &&
      durationSeconds < MIN_PODCAST_DURATION_SECONDS
    ) {
      return null; // short masquerading as a podcast
    }

    return {
      url,
      durationSeconds,
      sourceVideoId: entry.id,
      podcasterName: podcaster.name,
      title: typeof info?.title === 'string' ? info.title : entry.title,
      thumbnail:
        (info?.thumbnail as string | undefined) ?? entry.thumbnail ?? null,
      channelName:
        (info?.channel as string | undefined) ??
        (info?.uploader as string | undefined) ??
        entry.channel,
      viewCount:
        typeof info?.view_count === 'number'
          ? info.view_count
          : entry.viewCount,
      likeCount: typeof info?.like_count === 'number' ? info.like_count : null,
      publishedAt: parseUploadDate(info?.upload_date),
    };
  }
}

/** yt-dlp upload_date ("YYYYMMDD") → ISO string. */
export function parseUploadDate(value: unknown): string | null {
  return toUploadDate(value)?.toISOString() ?? null;
}

/** yt-dlp upload_date ("YYYYMMDD") → Date. */
export function toUploadDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{8}$/.test(value)) return null;
  const date = new Date(
    `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00Z`,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Minimal promise pool — map `items` through `worker`, `limit` at a time. */
export async function runPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length) as R[];
  let cursor = 0;
  const lanes = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await worker(items[index]);
      }
    },
  );
  await Promise.all(lanes);
  return results;
}
