import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { RenderState } from '../../generated/prisma/client.js';
import { ClipRendersService } from '../../modules/color-grading/clip-renders.service.js';
import { buildVideoFilterGraph } from '../../modules/color-grading/render-graph.utils.js';
import { FfmpegService } from '../../modules/media/ffmpeg.service.js';
import { StorageFolder } from '../../modules/storage/interfaces/storage.interface.js';
import { LocalStorageService } from '../../modules/storage/providers/local-storage.service.js';
import type { ColorGradingJobData } from '../job-data.types.js';
import { QUEUE_COLOR_GRADING } from '../queues.constants.js';

/**
 * Renders one clip variant: applies the requested effect chain (color
 * grading preset today; audio mixes and more join via buildVideoFilterGraph
 * and extra inputs later) and stores it next to — never over — the original
 * cut clip.
 */
@Processor(QUEUE_COLOR_GRADING)
export class ColorGradingProcessor extends WorkerHost {
  private readonly logger = new Logger(ColorGradingProcessor.name);

  constructor(
    private readonly renders: ClipRendersService,
    private readonly ffmpeg: FfmpegService,
    private readonly storage: LocalStorageService,
  ) {
    super();
  }

  async process(
    job: Job<ColorGradingJobData>,
  ): Promise<{ outputPath: string } | undefined> {
    const { renderId } = job.data;
    const render = await this.renders.findForProcessing(renderId);
    if (!render) {
      this.logger.warn(`Render ${renderId} no longer exists — skipping`);
      return undefined;
    }
    if (render.state === RenderState.READY && render.outputPath) {
      return { outputPath: render.outputPath };
    }
    if (!render.clip.clipPath) {
      await this.renders.markState(render.id, RenderState.FAILED, {
        errorMessage: 'Clip has no cut file to render from',
      });
      this.logger.warn(`Render ${renderId}: clip ${render.clipId} not cut`);
      return undefined;
    }

    const filterGraph = buildVideoFilterGraph(render);
    if (!filterGraph) {
      await this.renders.markState(render.id, RenderState.FAILED, {
        errorMessage: 'Render has no effects to apply',
      });
      return undefined;
    }

    await this.renders.markState(render.id, RenderState.PROCESSING);

    const inputAbsolute = this.storage.resolve(render.clip.clipPath);
    await this.storage.ensureDir(StorageFolder.OUTPUTS);
    const outputAbsolute = this.storage.resolve(
      StorageFolder.OUTPUTS,
      `${render.id}.mp4`,
    );

    try {
      await this.ffmpeg.applyFilterGraph({
        inputPath: inputAbsolute,
        outputPath: outputAbsolute,
        filterGraph,
      });
    } catch (error) {
      const lastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      if (lastAttempt) {
        await this.renders.markState(render.id, RenderState.FAILED, {
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }

    const relative = this.storage.relative(outputAbsolute);
    await this.renders.markState(render.id, RenderState.READY, {
      outputPath: relative,
      errorMessage: null,
    });
    this.logger.log(
      `Render ${render.id} (clip ${render.clipId}) -> ${relative}`,
    );
    return { outputPath: relative };
  }
}
