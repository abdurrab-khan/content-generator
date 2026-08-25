/**
 * Re-render one or more clip variants (e.g. after a render-pipeline fix
 * made earlier outputs bad). Resets each render to PENDING and re-enqueues
 * the job; the old output file is overwritten in place (ffmpeg -y).
 *
 * The previous queue entry is removed first — it may still sit in the
 * completed set (removeOnComplete keeps 100), and BullMQ dedupes on jobId,
 * which would silently swallow the requeue.
 *
 *   pnpm db:rerender -- <renderId> [renderId...]
 */
import 'dotenv/config';
import { Queue } from 'bullmq';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, RenderState } from '../src/generated/prisma/client.js';
import {
  JOB_APPLY_COLOR_GRADING,
  QUEUE_COLOR_GRADING,
} from '../src/jobs/queues.constants.js';

const renderIds = process.argv.slice(2);
if (renderIds.length === 0) {
  console.error('Usage: pnpm db:rerender -- <renderId> [renderId...]');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});
const queue = new Queue(QUEUE_COLOR_GRADING, {
  connection: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  },
});

async function main(): Promise<void> {
  for (const renderId of renderIds) {
    const render = await prisma.clipRender.findUnique({
      where: { id: renderId },
      select: { id: true, state: true },
    });
    if (!render) {
      console.error(`Render ${renderId} not found — skipped`);
      continue;
    }

    await prisma.clipRender.update({
      where: { id: renderId },
      data: { state: RenderState.PENDING, errorMessage: null },
    });
    await queue.remove(`render-${renderId}`).catch(() => undefined);
    await queue.add(
      JOB_APPLY_COLOR_GRADING,
      { renderId },
      {
        jobId: `render-${renderId}`,
        attempts: 2,
        backoff: { type: 'exponential', delay: 15_000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
    console.log(`Re-queued render ${renderId} (was ${render.state})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queue.close();
    await prisma.$disconnect();
  });
