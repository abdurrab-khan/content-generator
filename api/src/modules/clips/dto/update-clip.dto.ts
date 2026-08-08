import { z } from 'zod';

export const updateClipSchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    start: z.number().min(0).optional(),
    end: z.number().min(0).optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.start !== undefined ||
      value.end !== undefined,
    {
      message: 'At least one field must be provided',
    },
  );

export type UpdateClipDto = z.infer<typeof updateClipSchema>;
