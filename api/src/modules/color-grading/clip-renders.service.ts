import type { Readable } from 'node:stream';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service.js';
import {
  ClipState,
  RecordStatus,
  RenderState,
  type ClipRender,
  type ColorGradingPreset,
  type Prisma,
} from '../../generated/prisma/client.js';
import type { ColorGradingJobData } from '../../jobs/job-data.types.js';
import {
  JOB_APPLY_COLOR_GRADING,
  QUEUE_COLOR_GRADING,
} from '../../jobs/queues.constants.js';
import { LocalStorageService } from '../storage/providers/local-storage.service.js';
import type { CreateClipRenderDto } from './dto/create-clip-render.dto.js';

export type ClipRenderWithPreset = ClipRender & {
  colorGradingPreset: Pick<ColorGradingPreset, 'id' | 'name'> | null;
};

export interface ClipRenderStream {
  stream: Readable;
  sizeBytes: number;
  filename: string;
}

export interface SubmitRenderResult {
  render: ClipRenderWithPreset;
  /** false when the variant already existed and nothing was re-queued. */
  queued: boolean;
}

/** Re-exported so processors can type against the full include shape. */
export type ClipRenderForProcessing = Prisma.ClipRenderGetPayload<{
  include: { clip: true; colorGradingPreset: true };
}>;

/**
 * Dedupe key for one effect combination on a clip. Nullable-safe by
 * construction (unlike a multi-column unique over nullable FKs). Future
 * effects append their segment: `preset:<id>+audio:<id>`.
 */
export function buildVariantKey(effects: { presetId?: string }): string {
  const segments: string[] = [];
  if (effects.presetId) segments.push(`preset:${effects.presetId}`);
  if (segments.length === 0) {
    throw new BadRequestException('At least one effect must be selected');
  }
  return segments.join('+');
}

const PRESET_SUMMARY = { select: { id: true, name: true } } as const;

/**
 * Clip renders (variants): a clip keeps its original cut file; every render
 * is a separate output produced by applying effects (color grading today,
 * background music later — new effects extend `buildVariantKey` and the
 * processor's filter-graph seam, nothing here changes shape).
 */
@Injectable()
export class ClipRendersService {
  private readonly logger = new Logger(ClipRendersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageService,
    @InjectQueue(QUEUE_COLOR_GRADING)
    private readonly colorGradingQueue: Queue<ColorGradingJobData>,
  ) {}


  // ------------------------------------------------------------------ http

  /**
   * Request a variant of a clip. Idempotent per (clip, effect combination):
   * an existing PENDING/PROCESSING/READY render is returned untouched, a
   * FAILED one is reset and re-queued.
   */
  async submitForUser(
    userId: string,
    clipId: string,
    dto: CreateClipRenderDto,
  ): Promise<SubmitRenderResult> {
    const clip = await this.prisma.clip.findFirst({
      where: { id: clipId, project: { application: { userId } } },
    });
    if (!clip) throw new NotFoundException('Clip not found');
    if (clip.state !== ClipState.READY || !clip.clipPath) {
      throw new BadRequestException(
        'Clip must be cut (READY) before variants can be rendered',
      );
    }

    const preset = await this.prisma.colorGradingPreset.findFirst({
      where: { id: dto.presetId, status: RecordStatus.ACTIVE },
    });
    if (!preset) throw new NotFoundException('Color grading preset not found');

    const variantKey = buildVariantKey({ presetId: preset.id });
    const existing = await this.prisma.clipRender.findUnique({
      where: { clipId_variantKey: { clipId, variantKey } },
      include: { colorGradingPreset: PRESET_SUMMARY },
    });

    if (existing) {
      if (existing.state !== RenderState.FAILED) {
        return { render: existing, queued: false };
      }
      const render = await this.prisma.clipRender.update({
        where: { id: existing.id },
        data: {
          state: RenderState.PENDING,
          outputPath: null,
          errorMessage: null,
        },
        include: { colorGradingPreset: PRESET_SUMMARY },
      });
      await this.enqueue(render.id);
      return { render, queued: true };
    }

    const render = await this.prisma.clipRender.create({
      data: {
        clipId: clip.id,
        colorGradingPresetId: preset.id,
        variantKey,
        state: RenderState.PENDING,
      },
      include: { colorGradingPreset: PRESET_SUMMARY },
    });
    await this.enqueue(render.id);
    return { render, queued: true };
  }

  /** All variants of a clip (for the clip card). */
  async listForClip(
    userId: string,
    clipId: string,
  ): Promise<ClipRenderWithPreset[]> {
    await this.assertClipOwnership(userId, clipId);
    return this.prisma.clipRender.findMany({
      where: { clipId },
      include: { colorGradingPreset: PRESET_SUMMARY },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Delete a variant row + its file. The original clip is never touched. */
  async removeForUser(userId: string, renderId: string): Promise<void> {
    const render = await this.findOneForUser(userId, renderId);
    await this.prisma.clipRender.delete({ where: { id: render.id } });
    if (render.outputPath) {
      try {
        await this.storage.remove(this.storage.resolve(render.outputPath));
      } catch (error) {
        this.logger.warn(
          `Failed to remove render file "${render.outputPath}": ${error}`,
        );
      }
    }
  }

  /** Stream the rendered variant file (available once state is READY). */
  async getStreamForUser(
    userId: string,
    renderId: string,
  ): Promise<ClipRenderStream> {
    const render = await this.prisma.clipRender.findFirst({
      where: { id: renderId, clip: { project: { application: { userId } } } },
      include: { colorGradingPreset: true, clip: true },
    });
    if (!render) throw new NotFoundException('Render not found');
    if (render.state !== RenderState.READY || !render.outputPath) {
      throw new NotFoundException('Rendered file is not available yet');
    }
    const absolute = this.storage.resolve(render.outputPath);
    if (!(await this.storage.exists(absolute))) {
      throw new NotFoundException('Rendered file is missing from storage');
    }
    const info = (render.clip.clipInfo ?? {}) as Record<string, unknown>;
    const clipTitle = typeof info.title === 'string' ? info.title : null;
    const base =
      [clipTitle, render.colorGradingPreset?.name]
        .filter(Boolean)
        .join(' - ')
        .replace(/[^\w\- ]/g, '')
        .trim() || render.id;
    return {
      stream: this.storage.createReadStream(absolute),
      sizeBytes: await this.storage.sizeBytes(absolute),
      filename: `${base}.mp4`,
    };
  }

  // ------------------------------------------------------------------ jobs

  /** Render row with everything the processor needs. */
  async findForProcessing(
    renderId: string,
  ): Promise<ClipRenderForProcessing | null> {
    return this.prisma.clipRender.findUnique({
      where: { id: renderId },
      include: { clip: true, colorGradingPreset: true },
    });
  }

  async markState(
    renderId: string,
    state: RenderState,
    fields?: { outputPath?: string | null; errorMessage?: string | null },
  ): Promise<void> {
    await this.prisma.clipRender.update({
      where: { id: renderId },
      data: {
        state,
        ...(fields?.outputPath !== undefined
          ? { outputPath: fields.outputPath }
          : {}),
        ...(fields?.errorMessage !== undefined
          ? { errorMessage: fields.errorMessage }
          : {}),
      },
    });
  }

  // ------------------------------------------------------------------ intern

  private async enqueue(renderId: string): Promise<void> {
    await this.colorGradingQueue.add(
      JOB_APPLY_COLOR_GRADING,
      { renderId },
      {
        jobId: `render-${renderId}`, // idempotent — a render is queued once
        attempts: 2,
        backoff: { type: 'exponential', delay: 15_000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
    this.logger.log(`Queued color grading render ${renderId}`);
  }

  private async findOneForUser(
    userId: string,
    renderId: string,
  ): Promise<ClipRender> {
    const render = await this.prisma.clipRender.findFirst({
      where: { id: renderId, clip: { project: { application: { userId } } } },
    });
    if (!render) throw new NotFoundException('Render not found');
    return render;
  }

  private async assertClipOwnership(
    userId: string,
    clipId: string,
  ): Promise<void> {
    const clip = await this.prisma.clip.findFirst({
      where: { id: clipId, project: { application: { userId } } },
      select: { id: true },
    });
    if (!clip) throw new NotFoundException('Clip not found');
  }
}

