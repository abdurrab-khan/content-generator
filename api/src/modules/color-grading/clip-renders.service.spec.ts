import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ClipState,
  RecordStatus,
  RenderState,
} from '../../generated/prisma/client.js';
import {
  buildVariantKey,
  ClipRendersService,
} from './clip-renders.service.js';

function makeService() {
  const prisma = {
    clip: { findFirst: vi.fn() },
    colorGradingPreset: { findFirst: vi.fn() },
    clipRender: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  const queue = { add: vi.fn() };
  const service = new ClipRendersService(
    prisma as never,
    {} as never,
    queue as never,
  );
  return { prisma, queue, service };
}

const userId = 'user-1';
const clipId = 'clip-1';
const presetId = 'preset-1';

const readyClip = {
  id: clipId,
  state: ClipState.READY,
  clipPath: 'clips/clip-1.mp4',
};
const activePreset = { id: presetId, status: RecordStatus.ACTIVE };

function arrangeHappyPath(ctx: ReturnType<typeof makeService>): void {
  ctx.prisma.clip.findFirst.mockResolvedValue(readyClip);
  ctx.prisma.colorGradingPreset.findFirst.mockResolvedValue(activePreset);
}

describe('ClipRendersService.submitForUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a PENDING render and enqueues the job', async () => {
    const ctx = makeService();
    arrangeHappyPath(ctx);
    ctx.prisma.clipRender.findUnique.mockResolvedValue(null);
    ctx.prisma.clipRender.create.mockResolvedValue({ id: 'render-1' });

    const result = await ctx.service.submitForUser(userId, clipId, {
      presetId,
    });

    expect(ctx.prisma.clipRender.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clipId,
          colorGradingPresetId: presetId,
          variantKey: `preset:${presetId}`,
          state: RenderState.PENDING,
        }),
      }),
    );
    expect(ctx.queue.add).toHaveBeenCalledWith(
      'apply-color-grading',
      { renderId: 'render-1' },
      expect.objectContaining({ jobId: 'render-render-1', attempts: 2 }),
    );
    expect(result.queued).toBe(true);
  });

  it('returns the existing render without re-queuing when already READY', async () => {
    const ctx = makeService();
    arrangeHappyPath(ctx);
    const existing = { id: 'render-1', state: RenderState.READY };
    ctx.prisma.clipRender.findUnique.mockResolvedValue(existing);

    const result = await ctx.service.submitForUser(userId, clipId, {
      presetId,
    });

    expect(result).toEqual({ render: existing, queued: false });
    expect(ctx.prisma.clipRender.create).not.toHaveBeenCalled();
    expect(ctx.queue.add).not.toHaveBeenCalled();
  });

  it('resets and re-queues a FAILED render', async () => {
    const ctx = makeService();
    arrangeHappyPath(ctx);
    ctx.prisma.clipRender.findUnique.mockResolvedValue({
      id: 'render-1',
      state: RenderState.FAILED,
    });
    ctx.prisma.clipRender.update.mockResolvedValue({ id: 'render-1' });

    const result = await ctx.service.submitForUser(userId, clipId, {
      presetId,
    });

    expect(ctx.prisma.clipRender.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'render-1' },
        data: expect.objectContaining({
          state: RenderState.PENDING,
          outputPath: null,
          errorMessage: null,
        }),
      }),
    );
    expect(ctx.queue.add).toHaveBeenCalledOnce();
    expect(result.queued).toBe(true);
  });

  it('rejects when the clip is not cut yet', async () => {
    const ctx = makeService();
    ctx.prisma.clip.findFirst.mockResolvedValue({
      ...readyClip,
      state: ClipState.CUTTING,
    });

    await expect(
      ctx.service.submitForUser(userId, clipId, { presetId }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(ctx.prisma.colorGradingPreset.findFirst).not.toHaveBeenCalled();
  });

  it('rejects when the preset is missing or inactive', async () => {
    const ctx = makeService();
    ctx.prisma.clip.findFirst.mockResolvedValue(readyClip);
    ctx.prisma.colorGradingPreset.findFirst.mockResolvedValue(null);

    await expect(
      ctx.service.submitForUser(userId, clipId, { presetId }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(ctx.prisma.clipRender.create).not.toHaveBeenCalled();
  });

  it('rejects when the clip belongs to another user', async () => {
    const ctx = makeService();
    ctx.prisma.clip.findFirst.mockResolvedValue(null);

    await expect(
      ctx.service.submitForUser(userId, clipId, { presetId }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('buildVariantKey', () => {
  it('builds a deterministic key per effect combination', () => {
    expect(buildVariantKey({ presetId: 'p1' })).toBe('preset:p1');
  });

  it('rejects an empty effect combination', () => {
    expect(() => buildVariantKey({})).toThrow(BadRequestException);
  });
});
