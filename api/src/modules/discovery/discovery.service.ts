import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  DiscoveryStatus,
  PodcastLanguage,
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

/** Below this a video is a clip/short, not a podcast episode. */
export const MIN_PODCAST_DURATION_SECONDS = 20 * 60;
/** Flat-search results requested per podcaster. */
const SEARCH_RESULTS_PER_PODCASTER = 6;
/** Best candidates kept per podcaster before hydration. */
const CANDIDATES_PER_PODCASTER = 3;
const PODCASTER_CONCURRENCY = 3;
const HYDRATE_CONCURRENCY = 4;

/** A podcast suggestion returned to the client. */
export interface DiscoveredPodcastItem {
  sourceVideoId: string;
  url: string;
  title: string;
  thumbnail: string | null;
  channelName: string | null;
  podcasterName: string;
  durationSeconds: number | null;
  viewCount: number | null;
  likeCount: number | null;
  publishedAt: string | null;
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
   * Find podcast episodes: one flat search per podcaster, keep long-form
   * results the user has not seen, hydrate the survivors for views/likes,
   * then rank by mode.
   */
  async findPodcasts(
    userId: string,
    query: ListPodcastsQuery,
  ): Promise<{
    items: DiscoveredPodcastItem[];
    language: PodcastLanguage;
    mode: 'popular' | 'trending';
  }> {
    const application = await this.applications.findOwnedOrThrow(
      userId,
      query.applicationId,
    );
    const excludedIds = await this.loadExcludedVideoIds(application.id);

    let podcasters = podcastersForLanguage(application.language);
    if (query.podcasters) {
      const wanted = new Set(
        query.podcasters
          .split(',')
          .map((name) => name.trim().toLowerCase())
          .filter(Boolean),
      );
      podcasters = podcasters.filter((p) =>
        wanted.has(p.name.toLowerCase()),
      );
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

    // 2. Filter + dedupe: podcast-length, not excluded, first podcaster wins.
    const seen = new Set<string>();
    const candidates: {
      podcaster: PodcasterEntry;
      entry: YtDlpSearchEntry;
    }[] = [];
    for (const { podcaster, entries } of searches) {
      const kept = entries
        .filter((entry) => this.isPodcastCandidate(entry, excludedIds, seen))
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
        const item = await this.hydrate(podcaster, entry);
        return item && !excludedIds.has(item.sourceVideoId) ? item : null;
      },
    );
    const items = hydrated.filter(
      (item): item is DiscoveredPodcastItem => item !== null,
    );

    // 4. Rank: both modes rank by views; trending searched date-sorted, so
    //    its pool is recent episodes — popularity within recency.
    items.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));

    return {
      items: items.slice(0, query.limit),
      language: application.language,
      mode: query.mode,
    };
  }


  /**
   * "Not interested" — persist the snapshot as NOT_INTERESTED so discovery
   * never suggests the video again. A USED row is never downgraded.
   */
  async markNotInterested(userId: string, dto: NotInterestedDto) {
    await this.applications.findOwnedOrThrow(userId, dto.applicationId);

    const where = {
      applicationId_sourceVideoId: {
        applicationId: dto.applicationId,
        sourceVideoId: dto.sourceVideoId,
      },
    } as const;
    const existing = await this.prisma.discoveredPodcast.findUnique({ where });
    if (existing?.status === DiscoveryStatus.USED) return existing;

    return this.prisma.discoveredPodcast.upsert({
      where,
      create: {
        applicationId: dto.applicationId,
        sourceVideoId: dto.sourceVideoId,
        url: dto.url,
        title: dto.title,
        channelName: dto.channelName ?? null,
        thumbnail: dto.thumbnail ?? null,
        durationSeconds: dto.durationSeconds ?? null,
        viewCount: dto.viewCount ?? null,
        likeCount: dto.likeCount ?? null,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
        status: DiscoveryStatus.NOT_INTERESTED,
      },
      update: {
        url: dto.url,
        title: dto.title,
        channelName: dto.channelName ?? null,
        thumbnail: dto.thumbnail ?? null,
        durationSeconds: dto.durationSeconds ?? null,
        viewCount: dto.viewCount ?? null,
        likeCount: dto.likeCount ?? null,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
        status: DiscoveryStatus.NOT_INTERESTED,
      },
    });
  }

  /**
   * Cache hook called whenever a project is created (via discovery or
   * manually with a pasted URL): record the source video as USED so it
   * stays out of future suggestions even if the project is later deleted.
   * Best-effort — never blocks project creation.
   */
  async markUsed(
    applicationId: string,
    snapshot: PodcastSnapshot,
  ): Promise<void> {
    if (!snapshot.sourceVideoId) return;
    try {
      await this.prisma.discoveredPodcast.upsert({
        where: {
          applicationId_sourceVideoId: {
            applicationId,
            sourceVideoId: snapshot.sourceVideoId,
          },
        },
        create: {
          applicationId,
          sourceVideoId: snapshot.sourceVideoId,
          url: snapshot.url,
          title: snapshot.title,
          channelName: snapshot.channelName,
          thumbnail: snapshot.thumbnail,
          durationSeconds: snapshot.durationSeconds,
          viewCount: snapshot.viewCount,
          likeCount: snapshot.likeCount,
          publishedAt: snapshot.publishedAt,
          status: DiscoveryStatus.USED,
        },
        update: { status: DiscoveryStatus.USED },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to mark video ${snapshot.sourceVideoId} as USED: ${error instanceof Error ? error.message : error}`,
      );
    }
  }


  // -------------------------------------------------------------------------

  /** Videos to never suggest: USED/NOT_INTERESTED rows + existing projects. */
  private async loadExcludedVideoIds(
    applicationId: string,
  ): Promise<Set<string>> {
    const [discoveries, projects] = await Promise.all([
      this.prisma.discoveredPodcast.findMany({
        where: { applicationId },
        select: { sourceVideoId: true },
      }),
      this.prisma.project.findMany({
        where: { applicationId, sourceVideoId: { not: null } },
        select: { sourceVideoId: true },
      }),
    ]);
    const excluded = new Set(discoveries.map((row) => row.sourceVideoId));
    for (const project of projects) {
      if (project.sourceVideoId) excluded.add(project.sourceVideoId);
    }
    return excluded;
  }

  private isPodcastCandidate(
    entry: YtDlpSearchEntry,
    excludedIds: Set<string>,
    seen: Set<string>,
  ): boolean {
    if (excludedIds.has(entry.id) || seen.has(entry.id)) return false;
    // Unknown duration passes — hydration decides; known shorts are dropped.
    if (
      entry.durationSeconds !== null &&
      entry.durationSeconds < MIN_PODCAST_DURATION_SECONDS
    ) {
      return false;
    }
    return true;
  }

  /** Full metadata for one candidate; falls back to the flat-search data. */
  private async hydrate(
    podcaster: PodcasterEntry,
    entry: YtDlpSearchEntry,
  ): Promise<DiscoveredPodcastItem | null> {
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
      sourceVideoId: entry.id,
      url,
      title: typeof info?.title === 'string' ? info.title : entry.title,
      thumbnail:
        (info?.thumbnail as string | undefined) ?? entry.thumbnail ?? null,
      channelName:
        (info?.channel as string | undefined) ??
        (info?.uploader as string | undefined) ??
        entry.channel,
      podcasterName: podcaster.name,
      durationSeconds,
      viewCount:
        typeof info?.view_count === 'number'
          ? info.view_count
          : entry.viewCount,
      likeCount:
        typeof info?.like_count === 'number' ? info.like_count : null,
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

