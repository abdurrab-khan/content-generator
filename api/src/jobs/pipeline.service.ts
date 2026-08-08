import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service.js';
import { PipelineState, type Prisma } from '../generated/prisma/client.js';
import { RawVideosService } from '../modules/raw-videos/raw-videos.service.js';
import type { TranscriptJobData, VideoDownloadJobData } from './job-data.types.js';
import {
  JOB_DOWNLOAD_VIDEO,
  JOB_FETCH_TRANSCRIPT,
  QUEUE_TRANSCRIPT,
  QUEUE_VIDEO_DOWNLOAD,
} from './queues.constants.js';

/**
 * Kicks off the background pipeline for a freshly created project:
 * transcript + video download run as independent parallel tracks.
 */
@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    @InjectQueue(QUEUE_TRANSCRIPT) private readonly transcriptQueue: Queue<TranscriptJobData>,
    @InjectQueue(QUEUE_VIDEO_DOWNLOAD)
    private readonly videoDownloadQueue: Queue<VideoDownloadJobData>,
    private readonly prisma: PrismaService,
    private readonly rawVideos: RawVideosService,
  ) {}

  async startPipeline(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { id: projectId },
    });

    await this.rawVideos.createForProject(project.id, {
      title: project.title,
      description: project.description,
      podcastInfo: project.sourceInfo as Prisma.InputJsonValue | undefined,
    });

    await Promise.all([
      this.transcriptQueue.add(
        JOB_FETCH_TRANSCRIPT,
        { projectId },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      ),
      this.videoDownloadQueue.add(
        JOB_DOWNLOAD_VIDEO,
        { projectId },
        {
          attempts: 2,
          backoff: { type: 'exponential', delay: 30_000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      ),
    ]);

    await this.prisma.project.update({
      where: { id: projectId },
      data: { pipelineState: PipelineState.FETCHING_TRANSCRIPT },
    });
    this.logger.log(`Pipeline started for project ${projectId}`);
  }

  /** Terminal failure of any track marks the project failed. */
  async failProject(projectId: string, errorMessage: string): Promise<void> {
    await this.prisma.project.update({
      where: { id: projectId },
      data: { pipelineState: PipelineState.FAILED, errorMessage },
    });
    this.logger.error(`Project ${projectId} failed: ${errorMessage}`);
  }
}
