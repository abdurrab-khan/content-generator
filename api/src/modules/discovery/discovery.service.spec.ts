import { describe, expect, it } from 'vitest';
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

function makePrisma(opts: {
  cachedVideoIds?: string[];
  projectVideoIds?: string[];
}) {
  return {
    discoveredPodcast: {
      findMany: () =>
        Promise.resolve(
          (opts.cachedVideoIds ?? []).map((sourceVideoId) => ({
            sourceVideoId,
          })),
        ),
      upsert: () => Promise.resolve({}),
      findUnique: () => Promise.resolve(null),
    },
    project: {
      findMany: () =>
        Promise.resolve(
          (opts.projectVideoIds ?? []).map((sourceVideoId) => ({
            sourceVideoId,
          })),
        ),
    },
  };
}

function makeService(opts: {
  searches: Record<string, YtDlpSearchEntry[]>;
  cachedVideoIds?: string[];
  projectVideoIds?: string[];
}) {
  return new DiscoveryService(
    makePrisma(opts) as never,
    { findOwnedOrThrow: () => Promise.resolve(application) } as never,
    makeYtdlp(opts.searches) as never,
  );
}

const query: ListPodcastsQuery = {
  applicationId: 'app-1',
  mode: 'popular',
  limit: 12,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DiscoveryService.findPodcasts', () => {
  it('returns podcast-length videos ranked by views', async () => {
    const service = makeService({
      searches: {
        'The Joe Rogan Experience podcast': [
          entry('low', { viewCount: 500 }),
          entry('high', { viewCount: 9000 }),
          entry('mid', { viewCount: 3000 }),
        ],
      },
    });

    const result = await service.findPodcasts('user-1', {
      ...query,
      podcasters: 'Joe Rogan',
    });

    expect(result.language).toBe(PodcastLanguage.ENGLISH);
    expect(result.items.map((item) => item.sourceVideoId)).toEqual([
      'high',
      'mid',
      'low',
    ]);
    expect(result.items[0].podcasterName).toBe('Joe Rogan');
    expect(result.items[0].url).toContain('watch?v=high');
  });

  it('drops videos shorter than the podcast minimum', async () => {
    const service = makeService({
      searches: {
        'The Joe Rogan Experience podcast': [
          entry('short-clip', { durationSeconds: 45, viewCount: 999999 }),
          entry('episode', { durationSeconds: 5400 }),
        ],
      },
    });

    const result = await service.findPodcasts('user-1', {
      ...query,
      podcasters: 'Joe Rogan',
    });

    expect(result.items.map((item) => item.sourceVideoId)).toEqual([
      'episode',
    ]);
  });

  it('excludes USED / NOT_INTERESTED cache rows and existing projects', async () => {
    const service = makeService({
      searches: {
        'The Joe Rogan Experience podcast': [
          entry('used-video'),
          entry('dismissed-video'),
          entry('project-video'),
          entry('fresh-video'),
        ],
      },
      cachedVideoIds: ['used-video', 'dismissed-video'],
      projectVideoIds: ['project-video'],
    });

    const result = await service.findPodcasts('user-1', {
      ...query,
      podcasters: 'Joe Rogan',
    });

    expect(result.items.map((item) => item.sourceVideoId)).toEqual([
      'fresh-video',
    ]);
  });

  it('dedupes a video matched by several podcaster searches', async () => {
    const service = makeService({
      searches: {
        'The Joe Rogan Experience podcast': [entry('shared')],
        'The Diary Of A CEO podcast': [entry('shared')],
      },
    });

    const result = await service.findPodcasts('user-1', {
      ...query,
      podcasters: 'Joe Rogan, Steven Bartlett',
    });

    const ids = result.items.map((item) => item.sourceVideoId);
    expect(ids).toEqual(['shared']);
  });

  it('respects the limit', async () => {
    const service = makeService({
      searches: {
        'The Joe Rogan Experience podcast': [entry('a'), entry('b'), entry('c')],
      },
    });

    const result = await service.findPodcasts('user-1', {
      ...query,
      podcasters: 'Joe Rogan',
      limit: 2,
    });

    expect(result.items).toHaveLength(2);
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
    await runPool(Array.from({ length: 10 }, (_, i) => i), 3, async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
    });
    expect(peak).toBeLessThanOrEqual(3);
  });
});

describe('MIN_PODCAST_DURATION_SECONDS', () => {
  it('is 20 minutes', () => {
    expect(MIN_PODCAST_DURATION_SECONDS).toBe(1200);
  });
});

