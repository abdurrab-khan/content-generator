import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ClipState,
  PipelineState,
  RecordStatus,
} from '../../generated/prisma/client.js';
import { ClipsService, type AgentClipCandidate } from './clips.service.js';

function makeService() {
  const prisma = {
    clip: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };
  const service = new ClipsService(prisma as never, {} as never);
  return { prisma, service };
}

const candidate: AgentClipCandidate = {
  start: 1003,
  end: 1049,
  title: 'The "Real World" Math',
  hook: 'Experts say home returns are zero.',
  viralityScore: 80,
  reason: 'Contrasts academic models with lived experience.',
};

describe('ClipsService.createFromAgent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reuses the existing clip when start AND end match exactly (retry idempotency)', async () => {
    const { prisma, service } = makeService();
    const existing = { id: 'clip-1' };
    prisma.clip.findFirst.mockResolvedValue(existing);

    const result = await service.createFromAgent('project-1', 0, candidate);

    expect(prisma.clip.findFirst).toHaveBeenCalledWith({
      where: { projectId: 'project-1', start: 1003, end: 1049 },
    });
    expect(prisma.clip.create).not.toHaveBeenCalled();
    expect(result).toBe(existing);
  });

  it('creates a new clip when only the start matches (end differs)', async () => {
    const { prisma, service } = makeService();
    prisma.clip.findFirst.mockResolvedValue(null);
    prisma.clip.create.mockResolvedValue({ id: 'clip-2' });

    await service.createFromAgent('project-1', 0, {
      ...candidate,
      end: 1050,
    });

    expect(prisma.clip.create).toHaveBeenCalledOnce();
  });

  it('rejects ranges outside the allowed duration before touching the DB', async () => {
    const { prisma, service } = makeService();

    await expect(
      service.createFromAgent('project-1', 0, {
        ...candidate,
        end: candidate.start + 5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.clip.findFirst).not.toHaveBeenCalled();
  });
});

describe('ClipsService.findCuttableClips', () => {
  it('only sweeps clips whose project finished analysis (CLIPS_READY/CUTTING gate)', async () => {
    const { prisma, service } = makeService();
    prisma.clip.findMany.mockResolvedValue([]);

    await service.findCuttableClips(10);

    expect(prisma.clip.findMany).toHaveBeenCalledWith({
      where: {
        state: ClipState.NOT_STARTED,
        project: {
          status: RecordStatus.ACTIVE,
          videoPath: { not: null },
          pipelineState: {
            in: [PipelineState.CLIPS_READY, PipelineState.CUTTING],
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });
  });
});
