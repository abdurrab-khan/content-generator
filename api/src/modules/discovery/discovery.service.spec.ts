import { describe, expect, it, vi } from 'vitest';
import { PodcastLanguage } from '../../generated/prisma/client.js';
import type { YtDlpSearchEntry } from '../sources/ytdlp/yt-dlp.service.js';
import {
  DiscoveryService,
  MIN_PODCAST_DURATION_SECONDS,
  parseUploadDate,
  runPool,
} from './discovery.service.js';
import type { ListPodcastsQuery } from './dto/discovery.dto.js';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

const application = {
  id: 'app-1',
  name: 'podcast-clips',
  description: null,
  isActive: true,
  language: PodcastLanguage.ENGLISH,
  userId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function entry(
  id: string,
  overrides: Partial<YtDlpSearchEntry> = {},
): YtDlpSearchEntry {
  return {
    id,
    title: `Episode ${id}`,
    url: `https://www.youtube.com/watch?v=${id}`,
    channel: 'Some Channel',
    durationSeconds: 3600,
    viewCount: 1000,
    thumbnail: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    ...overrides,
  };
}

function makeYtdlp(searches: Record<string, YtDlpSearchEntry[]>) {
  return {
    searchVideos: (query: string) => Promise.resolve(searches[query] ?? []),
    // No network in tests: hydration fails → service falls back to flat data.
    dumpJson: () => Promise.reject(new Error('no network in tests')),
  };
}

interface PrismaFake {
  discoveredPodcast: {
    findMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
  project: { findMany: ReturnType<typeof vi.fn> };
  created: { data: unknown[] } | null;
}

function makePrisma(opts: {
  storedPodcasts?: unknown[];
  projectVideoIds?: string[];
}): PrismaFake {
  const fake: PrismaFake = {
    discoveredPodcast: {
      findMany: vi.fn(() => Promise.resolve(opts.storedPodcasts ?? [])),
      deleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
      createMany: vi.fn((args: { data: unknown[] }) => {
        fake.created = { data: args.data };
        return Promise.resolve({ count: args.data.length });
      }),
    },
    project: {
      findMany: vi.fn(() =>
        Promise.resolve(
          (opts.projectVideoIds ?? []).map((sourceVideoId) => ({
            sourceVideoId,
          })),
        ),
      ),
    },
    created: null,
  };
  return fake;
}

function makeRedis(opts: { excludedVideoIds?: string[] } = {}) {
  const sets = new Map<string, Set<string>>();
  const seed = new Set(opts.excludedVideoIds ?? []);
  return {
    sets,
    sadd: vi.fn((key: string, member: string) => {
      if (!sets.has(key)) sets.set(key, new Set());
      if (key.endsWith('-fail')) return Promise.reject(new Error('redis down'));
      sets.get(key)!.add(member);
      if (!seed.has(member)) seed.add(member);
      return Promise.resolve(1);
    }),
    smembers: vi.fn((key: string) => {
      // Seed both USED and NOT_INTERESTED sets so exclusion tests stay simple.
      if (seed.size > 0 && !sets.has(key)) return Promise.resolve([...seed]);
      return Promise.resolve([...(sets.get(key) ?? [])]);
    }),
  };
}

function makeService(opts: {
  searches?: Record<string, YtDlpSearchEntry[]>;
  storedPodcasts?: unknown[];
  projectVideoIds?: string[];
  excludedVideoIds?: string[];
  redis?: ReturnType<typeof makeRedis>;
  prisma?: PrismaFake;
}) {
  const prisma = opts.prisma ?? makePrisma(opts);
  const redis = opts.redis ?? makeRedis(opts);
  const service = new DiscoveryService(
    prisma as never,
    redis as never,
    { findOwnedOrThrow: () => Promise.resolve(application) } as never,
    makeYtdlp(opts.searches ?? {}) as never,
  );
  return { service, prisma, redis };
}

const query: ListPodcastsQuery = {
  applicationId: 'app-1',
  mode: 'popular',
  limit: 12,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DiscoveryService.refetchPodcasts', () => {
  it('returns podcast-length videos ranked by views', async () => {
    const { service, prisma } = makeService({
      searches: {
        'The Joe Rogan Experience podcast': [
          entry('low', { viewCount: 500 }),
          entry('high', { viewCount: 9000 }),
          entry('mid', { viewCount: 3000 }),
        ],
      },
    });

    await service.refetchPodcasts('user-1', {
      ...query,
      podcasters: 'Joe Rogan',
    });

    const rows = prisma.created!.data as { sourceVideoId: string }[];
    expect(rows.map((r) => r.sourceVideoId)).toEqual(['high', 'mid', 'low']);
    expect(prisma.created!.data[0]).toMatchObject({
      podcasterName: 'Joe Rogan',
      applicationId: 'app-1',
    });
  });

  it('drops videos shorter than the podcast minimum', async () => {
    const { service, prisma } = makeService({
      searches: {
        'The Joe Rogan Experience podcast': [
          entry('short-clip', { durationSeconds: 45, viewCount: 999999 }),
          entry('episode', { durationSeconds: 5400 }),
        ],
      },
    });

    await service.refetchPodcasts('user-1', {
      ...query,
      podcasters: 'Joe Rogan',
    });

    expect(
      (prisma.created!.data as { sourceVideoId: string }[]).map(
        (r) => r.sourceVideoId,
      ),
    ).toEqual(['episode']);
  });

  it('excludes USED / NOT_INTERESTED cache rows and existing projects', async () => {
    const { service, prisma } = makeService({
      searches: {
        'The Joe Rogan Experience podcast': [
          entry('used-video'),
          entry('dismissed-video'),
          entry('project-video'),
          entry('fresh-video'),
        ],
      },
      excludedVideoIds: ['used-video', 'dismissed-video'],
      projectVideoIds: ['project-video'],
    });

    await service.refetchPodcasts('user-1', {
      ...query,
      podcasters: 'Joe Rogan',
    });

    expect(
      (prisma.created!.data as { sourceVideoId: string }[]).map(
        (r) => r.sourceVideoId,
      ),
    ).toEqual(['fresh-video']);
  });

  it('dedupes a video matched by several podcaster searches', async () => {
    const { service, prisma } = makeService({
      searches: {
        'The Joe Rogan Experience podcast': [entry('shared')],
        'The Diary Of A CEO podcast': [entry('shared')],
      },
    });

    await service.refetchPodcasts('user-1', {
      ...query,
      podcasters: 'Joe Rogan, Steven Bartlett',
    });

    const ids = (prisma.created!.data as { sourceVideoId: string }[]).map(
      (r) => r.sourceVideoId,
    );
    expect(ids).toEqual(['shared']);
  });

  it('respects the limit', async () => {
    const { service, prisma } = makeService({
      searches: {
        'The Joe Rogan Experience podcast': [
          entry('a'),
          entry('b'),
          entry('c'),
        ],
      },
    });

    await service.refetchPodcasts('user-1', {
      ...query,
      podcasters: 'Joe Rogan',
      limit: 2,
    });

    expect(prisma.created!.data).toHaveLength(2);
  });

  it('persists Date publishedAt and replaces only the current mode', async () => {
    const { service, prisma } = makeService({
      searches: {
        'The Joe Rogan Experience podcast': [entry('a')],
      },
    });

    await service.refetchPodcasts('user-1', {
      ...query,
      podcasters: 'Joe Rogan',
      mode: 'popular',
    });

    expect(prisma.discoveredPodcast.deleteMany).toHaveBeenCalledWith({
      where: { podcastType: 'POPULAR', applicationId: 'app-1' },
    });
    // dumpJson fails in tests → no upload_date → null (must be Date|null, not string)
    const row = prisma.created!.data[0] as { publishedAt: unknown };
    expect(row.publishedAt === null || row.publishedAt instanceof Date).toBe(
      true,
    );
  });

  it('does not wipe the cache when nothing was found', async () => {
    const { service, prisma } = makeService({ searches: {} });

    await service.refetchPodcasts('user-1', query);

    expect(prisma.discoveredPodcast.deleteMany).not.toHaveBeenCalled();
    expect(prisma.discoveredPodcast.createMany).toHaveBeenCalledWith({
      data: [],
    });
  });
});

describe('DiscoveryService.findPodcasts', () => {
  it('returns stored rows with the application language', async () => {
    const stored = [
      { sourceVideoId: 'a', title: 'A' },
      { sourceVideoId: 'b', title: 'B' },
    ];
    const { service } = makeService({ storedPodcasts: stored });

    const result = await service.findPodcasts('user-1', query);

    expect(result.language).toBe(PodcastLanguage.ENGLISH);
    expect(result.mode).toBe('popular');
    expect(result.items).toEqual(stored);
  });
});

describe('DiscoveryService.markNotInterested / markUsed', () => {
  const dto = {
    applicationId: 'app-1',
    sourceVideoId: 'vid-1',
    url: 'https://www.youtube.com/watch?v=vid-1',
    title: 'Episode',
  };

  it('markNotInterested adds to redis and removes the suggestion', async () => {
    const { service, redis, prisma } = makeService({});

    await service.markNotInterested('user-1', dto);

    expect(redis.sadd).toHaveBeenCalledWith(
      'not-interested-podcast-app-1',
      'vid-1',
    );
    expect(prisma.discoveredPodcast.deleteMany).toHaveBeenCalledWith({
      where: { sourceVideoId: 'vid-1', applicationId: 'app-1' },
    });
  });

  it('markUsed adds to redis and removes the suggestion', async () => {
    const { service, redis, prisma } = makeService({});

    await service.markUsed('app-1', {
      sourceVideoId: 'vid-1',
      url: 'https://www.youtube.com/watch?v=vid-1',
      title: 'Episode',
      channelName: null,
      thumbnail: null,
      durationSeconds: null,
      viewCount: null,
      likeCount: null,
      publishedAt: null,
    });

    expect(redis.sadd).toHaveBeenCalledWith('used-podcast-app-1', 'vid-1');
    expect(prisma.discoveredPodcast.deleteMany).toHaveBeenCalledWith({
      where: { applicationId: 'app-1', sourceVideoId: 'vid-1' },
    });
  });

  it('markUsed ignores snapshots without a video id', async () => {
    const { service, redis, prisma } = makeService({});

    await service.markUsed('app-1', {
      sourceVideoId: '',
      url: 'https://www.youtube.com/watch?v=x',
      title: 'Episode',
      channelName: null,
      thumbnail: null,
      durationSeconds: null,
      viewCount: null,
      likeCount: null,
      publishedAt: null,
    });

    expect(redis.sadd).not.toHaveBeenCalled();
    expect(prisma.discoveredPodcast.deleteMany).not.toHaveBeenCalled();
  });

  it('is best-effort: redis failure never throws', async () => {
    const redis = makeRedis({});
    redis.sadd.mockRejectedValueOnce(new Error('redis down'));
    const { service } = makeService({ redis });

    await expect(service.markUsed('app-1', {
      sourceVideoId: 'vid-1',
      url: 'https://www.youtube.com/watch?v=vid-1',
      title: 'Episode',
      channelName: null,
      thumbnail: null,
      durationSeconds: null,
      viewCount: null,
      likeCount: null,
      publishedAt: null,
    })).resolves.toBeUndefined();

    await expect(service.markNotInterested('user-1', dto)).resolves
      .toBeUndefined();
  });
});

describe('parseUploadDate', () => {
  it('converts yt-dlp YYYYMMDD to ISO', () => {
    expect(parseUploadDate('20240815')).toBe('2024-08-15T00:00:00.000Z');
  });

  it.each([null, undefined, 42, 'nope', '2024-08-15'])(
    'returns null for %s',
    (value) => {
      expect(parseUploadDate(value)).toBeNull();
    },
  );
});

describe('runPool', () => {
  it('maps every item and preserves order', async () => {
    const input = Array.from({ length: 20 }, (_, i) => i);
    const results = await runPool(input, 4, async (n) => {
      await new Promise((resolve) => setTimeout(resolve, (n % 3) * 5));
      return n * 2;
    });
    expect(results).toEqual(input.map((n) => n * 2));
  });

  it('never exceeds the concurrency limit', async () => {
    let active = 0;
    let peak = 0;
    await runPool(
      Array.from({ length: 10 }, (_, i) => i),
      3,
      async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
      },
    );
    expect(peak).toBeLessThanOrEqual(3);
  });
});

describe('MIN_PODCAST_DURATION_SECONDS', () => {
  it('is 20 minutes', () => {
    expect(MIN_PODCAST_DURATION_SECONDS).toBe(1200);
  });
});
