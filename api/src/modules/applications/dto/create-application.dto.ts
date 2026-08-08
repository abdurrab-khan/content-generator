import { z } from 'zod';

export const createApplicationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
});

export type CreateApplicationDto = z.infer<typeof createApplicationSchema>;
