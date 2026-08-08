import { z } from 'zod';

/**
 * What the LLM reports for one viral moment.
 * Timestamps are absolute "HH:MM:SS" — the chunk text carries absolute
 * times, and the model must never do time arithmetic itself.
 */
export const extractedClipSchema = z.object({
  start: z
    .string()
    .describe('Absolute start timestamp of the moment in the source video, HH:MM:SS'),
  end: z
    .string()
    .describe('Absolute end timestamp of the moment in the source video, HH:MM:SS'),
  title: z.string().max(120).describe('Short catchy clip title'),
  hook: z
    .string()
    .max(280)
    .describe('One-sentence hook describing why this moment stops the scroll'),
  viralityScore: z
    .number()
    .min(0)
    .max(100)
    .describe('0-100 predicted virality score'),
  reason: z
    .string()
    .max(500)
    .describe('Brief reasoning: what makes this moment shareable'),
});

export type ExtractedClip = z.infer<typeof extractedClipSchema>;
