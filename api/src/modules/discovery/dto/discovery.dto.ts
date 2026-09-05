import { z } from 'zod';

export const discoveryModeSchema = z
  .enum(['popular', 'trending'])
  .default('popular')
  .describe(
    'popular = all-time most-viewed episodes; trending = recent uploads ranked by views',
  );

export const listPodcastsQuerySchema = z.object({
  applicationId: z
    .uuid()
    .describe('Application whose language drives the podcaster catalog'),
  mode: discoveryModeSchema,
  limit: z.coerce.number().int().min(1).max(30).default(12),
  podcasters: z
    .string()
    .optional()
    .describe(
      'Optional comma-separated podcaster names (from the catalog) to search only those',
    ),
});

export type ListPodcastsQuery = z.infer<typeof listPodcastsQuerySchema>;

export const listPodcastersQuerySchema = z.object({
  applicationId: z
    .uuid()
    .optional()
    .describe(
      'Resolve the catalog from the application language (preferred). ' +
        'Falls back to `language` when omitted.',
    ),
  language: z.enum(['ENGLISH', 'HINDI']).optional(),
});

export type ListPodcastersQuery = z.infer<typeof listPodcastersQuerySchema>;

/** Video snapshot sent by the client when dismissing a suggestion. */
const podcastSnapshotShape = {
  sourceVideoId: z.string().min(1),
  url: z.url(),
  title: z.string().min(1).max(500),
  channelName: z.string().max(200).nullish(),
  thumbnail: z.url().nullish(),
  durationSeconds: z.number().int().nonnegative().nullish(),
  viewCount: z.number().int().nonnegative().nullish(),
  likeCount: z.number().int().nonnegative().nullish(),
  publishedAt: z.iso.datetime().nullish(),
};

export const notInterestedSchema = z.object({
  applicationId: z.uuid(),
  ...podcastSnapshotShape,
});

export type NotInterestedDto = z.infer<typeof notInterestedSchema>;

export const usePodcastSchema = z.object({
  applicationId: z.uuid(),
  url: z.url().describe('YouTube URL of the podcast to turn into a project'),
  // Optional snapshot so the USED cache row carries the display metadata.
  title: z.string().max(500).optional(),
  channelName: z.string().max(200).nullish(),
  thumbnail: z.url().nullish(),
  durationSeconds: z.number().int().nonnegative().nullish(),
  viewCount: z.number().int().nonnegative().nullish(),
  likeCount: z.number().int().nonnegative().nullish(),
  publishedAt: z.iso.datetime().nullish(),
});

export type UsePodcastDto = z.infer<typeof usePodcastSchema>;
