import { z } from 'zod';

/**
 * Central, validated environment configuration.
 * The app refuses to boot with an invalid configuration (fail fast).
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_HOST: z.string().min(1).default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),

  BETTER_AUTH_SECRET: z
    .string()
    .min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.url().default('http://localhost:3000'),

  MODEL_BASE_URL: z.string().default(''),
  MODEL_API_KEY: z.string().default(''),
  AI_MODEL: z.string().default('deepseek-chat'),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.3),

  STORAGE_ROOT: z.string().default('./storage'),

  YTDLP_PATH: z.string().default('yt-dlp'),
  FFMPEG_PATH: z.string().default('ffmpeg'),
  FFPROBE_PATH: z.string().default('ffprobe'),

  CHUNK_MINUTES: z.coerce.number().positive().default(9),
  CHUNK_OVERLAP_SECONDS: z.coerce.number().min(0).default(30),
  ANALYSIS_CONCURRENCY: z.coerce.number().int().positive().default(5),
  CLIP_CUTTING_CRON: z.string().default('*/2 * * * *'),

  DEV_USER_EMAIL: z.email().default('dev@example.com'),
  DEV_USER_PASSWORD: z.string().min(8).default('password123'),
  DEV_USER_NAME: z.string().default('Dev User'),
});

export type Env = z.infer<typeof envSchema>;

/** Used by ConfigModule.forRoot({ validate }) — throws on invalid env. */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}
