import { z } from 'zod';

export const createProjectSchema = z.object({
  url: z.url().describe('Video URL (YouTube today; more sources later)'),
  applicationId: z
    .uuid()
    .optional()
    .describe('Target application; defaults to your "podcast-clips" app'),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;

export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['ACTIVE', 'BIN', 'DELETED', 'ERROR']).optional(),
});

export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
