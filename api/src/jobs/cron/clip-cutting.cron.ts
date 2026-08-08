import 'dotenv/config';
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Cron } from '@nestjs/schedule';
import type { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service.js';
import { ClipState, PipelineState } from '../../generated/prisma/client.js';
import { ClipsService } from '../../modules/clips/clips.service.js';
import type { CutClipJobData } from '../job-data.types.js';
import { JOB_CUT_CLIP, QUEUE_CLIP_CUTTING } from '../queues.constants.js';

const CRON_EXPRESSION = process.env.CLIP_CUTTING_CRON ?? '*/2 * * * *';
const BATCH_SIZE = 25;

/**
 * The sweep from the architecture diagram: periodically picks clips whose
 * video has been downloaded and pushes them into the FFmpeg cutting queue.
 * Cutting never waits on analysis and vice versa — this cron is the join.
 */
@Injectable()
export class ClipCuttingCron {
  private readonly logger = new Logger(ClipCuttingCron.name);
  private running = false;

  constructor(
    private readonly clips: ClipsService,
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_CLIP_CUTTING)
    private readonly cuttingQueue: Queue<CutClipJobData>,
  ) {}

  @Cron(CRON_EXPRESSION)
  async sweep(): Promise<void> {
    if (this.running) return; // never overlap sweeps
    this.running = true;
    try {
      const cuttable = await this.clips.findCuttableClips(BATCH_SIZE);
      if (cuttable.length === 0) return;

      for (const clip of cuttable) {
        await this.clips.markState([clip.id], ClipState.PENDING);
        await this.cuttingQueue.add(
          JOB_CUT_CLIP,
          { clipId: clip.id },
          {
            jobId: `cut-${clip.id}`, // idempotent — a clip is queued once
            attempts: 2,
            backoff: { type: 'exponential', delay: 15_000 },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        );
      }

      const projectIds = [...new Set(cuttable.map((clip) => clip.projectId))];
      await this.prisma.project.updateMany({
        where: {
          id: { in: projectIds },
          pipelineState: {
            in: [PipelineState.CLIPS_READY, PipelineState.VIDEO_READY],
          },
        },
        data: { pipelineState: PipelineState.CUTTING },
      });

      this.logger.log(`Queued ${cuttable.length} clip(s) for cutting`);
    } finally {
      this.running = false;
    }
  }
}
