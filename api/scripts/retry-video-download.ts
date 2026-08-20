/**
 * Retry the video download for a project whose download track failed
 * (e.g. a transient yt-dlp 403 after YouTube rotated player clients).
 *
 * Resets the raw-video download state, clears the project error, and
 * re-enqueues the download job with the same options PipelineService uses.
 * Once videoPath lands, the clip-cutting cron picks the clips up on its
 * own — no other pipeline state needs touching.
 *
 *   pnpm db:retry-download -- <projectId>
 */
import 'dotenv/config';
import { Queue } from 'bullmq';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  DownloadState,
  PipelineState,
  PrismaClient,
} from '../src/generated/prisma/client.js';
import {
  JOB_DOWNLOAD_VIDEO,
  QUEUE_VIDEO_DOWNLOAD,
} from '../src/jobs/queues.constants.js';

const projectId = process.argv[2];
if (!projectId) {
  console.error('Usage: pnpm db:retry-download -- <projectId>');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});
const queue = new Queue(QUEUE_VIDEO_DOWNLOAD, {
  connection: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  },
});

async function main(): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      pipelineState: true,
      videoPath: true,
      errorMessage: true,
    },
  });
  if (!project) throw new Error(`Project ${projectId} not found`);
  if (project.videoPath) {
    console.log(`Project ${projectId} already has a video (${project.videoPath}) — nothing to retry.`);
    return;
  }

  const reset = await prisma.rawVideo.updateMany({
    where: { projectId, downloadState: DownloadState.FAILED },
    data: { downloadState: DownloadState.DOWNLOADING },
  });
  // DOWNLOADING_VIDEO mirrors the processor's own transition; the guard
  // against regressing analysis milestones is kept (same notIn list).
  await prisma.project.update({
    where: { id: projectId },
    data: {
      errorMessage: null,
      ...(project.pipelineState === PipelineState.FAILED
        ? { pipelineState: PipelineState.DOWNLOADING_VIDEO }
        : {}),
    },
  });

  await queue.add(
    JOB_DOWNLOAD_VIDEO,
    { projectId },
    {
      attempts: 2,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  );

  console.log(
    `Re-queued download for project ${projectId} ` +
      `(state ${project.pipelineState}, reset ${reset.count} raw video(s)).`,
  );
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
