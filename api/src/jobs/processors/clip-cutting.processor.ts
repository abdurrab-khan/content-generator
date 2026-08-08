import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service.js';
import { ClipState, PipelineState } from '../../generated/prisma/client.js';
import { ClipsService } from '../../modules/clips/clips.service.js';
import { FfmpegService } from '../../modules/media/ffmpeg.service.js';
import { StorageFolder } from '../../modules/storage/interfaces/storage.interface.js';
import { LocalStorageService } from '../../modules/storage/providers/local-storage.service.js';
import { VideosService } from '../../modules/videos/videos.service.js';
import type { CutClipJobData } from '../job-data.types.js';
import { QUEUE_CLIP_CUTTING } from '../queues.constants.js';

/** Cuts one clip with FFmpeg, stores it, and creates the final Video row. */
@Processor(QUEUE_CLIP_CUTTING)
export class ClipCuttingProcessor extends WorkerHost {
  private readonly logger = new Logger(ClipCuttingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clips: ClipsService,
    private readonly videos: VideosService,
    private readonly ffmpeg: FfmpegService,
    private readonly storage: LocalStorageService,
  ) {
    super();
  }

  async process(job: Job<CutClipJobData>): Promise<{ clipPath: string } | undefined> {
    const { clipId } = job.data;
    const clip = await this.prisma.clip.findUnique({
      where: { id: clipId },
      include: { project: true },
    });
    if (!clip) {
      this.logger.warn(`Clip ${clipId} no longer exists — skipping`);
      return undefined;
    }
    if (clip.state === ClipState.READY) return { clipPath: clip.clipPath ?? '' };
    if (!clip.project.videoPath) {
      throw new Error(`Project ${clip.projectId} has no downloaded video yet`);
    }

    await this.clips.markState([clip.id], ClipState.CUTTING);

    const inputAbsolute = this.storage.resolve(clip.project.videoPath);
    await this.storage.ensureDir(StorageFolder.CLIPS);
    const outputAbsolute = this.storage.resolve(StorageFolder.CLIPS, `${clip.id}.mp4`);

    try {
      await this.ffmpeg.cutClip({
        inputPath: inputAbsolute,
        outputPath: outputAbsolute,
        startSeconds: clip.start,
        endSeconds: clip.end,
        precise: true,
      });
    } catch (error) {
      const lastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      if (lastAttempt) {
        await this.clips.markState([clip.id], ClipState.FAILED);
      }
      throw error;
    }

    const relative = this.storage.relative(outputAbsolute);
    await this.clips.markState([clip.id], ClipState.READY, relative);
    await this.videos.createFromClip(clip, relative, clip.end - clip.start);

    const unfinished = await this.clips.countUnfinishedByProject(clip.projectId);
    if (unfinished === 0) {
      await this.prisma.project.update({
        where: { id: clip.projectId },
        data: { pipelineState: PipelineState.COMPLETED },
      });
      this.logger.log(`Project ${clip.projectId}: all clips cut — COMPLETED`);
    }

    return { clipPath: relative };
  }
}
