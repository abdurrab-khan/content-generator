import { z } from 'zod';

/**
 * Effect combination requested for one clip variant. Today only a color
 * grading preset; later `audioTrackId`, `options`, ... join in (with a
 * refinement that at least one effect is present).
 */
export const createClipRenderSchema = z.object({
  presetId: z.uuid(),
});

export type CreateClipRenderDto = z.infer<typeof createClipRenderSchema>;
