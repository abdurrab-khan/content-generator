import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service.js';
import { PipelineState } from '../../generated/prisma/client.js';
import { RawVideosService } from '../../modules/raw-videos/raw-videos.service.js';
import { SourceRegistryService } from '../../modules/sources/source-registry.service.js';
import { StorageFolder } from '../../modules/storage/interfaces/storage.interface.js';
import { LocalStorageService } from '../../modules/storage/providers/local-storage.service.js';
import type { VideoDownloadJobData } from '../job-data.types.js';
import { PipelineService } from '../pipeline.service.js';
import { QUEUE_VIDEO_DOWNLOAD } from '../queues.constants.js';

/** Video track: independent of transcript/analysis — clips wait on this via cron. */
@Processor(QUEUE_VIDEO_DOWNLOAD)
export class VideoDownloadProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoDownloadProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sources: SourceRegistryService,
    private readonly storage: LocalStorageService,
    private readonly rawVideos: RawVideosService,
    private readonly pipeline: PipelineService,
  ) {
    super();
  }

  async process(job: Job<VideoDownloadJobData>): Promise<{ videoPath: string }> {
    const { projectId } = job.data;
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { id: projectId },
    });

    const provider = this.sources.getProviderByType(project.sourceType);
    if (!provider) {
      throw new Error(`No provider for source type ${project.sourceType}`);
    }

    await this.prisma.project.update({
      where: { id: projectId },
      data: { pipelineState: PipelineState.DOWNLOADING_VIDEO },
    });

    await this.storage.ensureDir(StorageFolder.VIDEOS);
    const outputAbsolute = this.storage.resolve(StorageFolder.VIDEOS, `${projectId}.mp4`);

    try {
      await provider.downloadVideo(project.sourceUrl, outputAbsolute);
    } catch (error) {
      const lastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      if (lastAttempt) {
        await this.rawVideos.markFailed(projectId);
        await this.pipeline.failProject(
          projectId,
          error instanceof Error ? error.message : 'Video download failed',
        );
      }
      throw error;
    }

    const relative = this.storage.relative(outputAbsolute);
    await this.prisma.project.update({
      where: { id: projectId },
      data: { videoPath: relative, pipelineState: PipelineState.VIDEO_READY },
    });
    await this.rawVideos.markDownloaded(projectId, relative);

    this.logger.log(`Project ${projectId}: video downloaded -> ${relative}`);
    return { videoPath: relative };
  }
}
