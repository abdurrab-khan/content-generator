import type { Readable } from 'node:stream';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  ClipState,
  RecordStatus,
  type Clip,
  type Prisma,
} from '../../generated/prisma/client.js';
import { LocalStorageService } from '../storage/providers/local-storage.service.js';
import { findDuplicateClipIds } from './clip-merge.utils.js';
import type { UpdateClipDto } from './dto/update-clip.dto.js';

export interface AgentClipCandidate {
  start: number;
  end: number;
  title: string;
  hook: string;
  viralityScore: number;
  reason: string;
}

export interface ClipStream {
  stream: Readable;
  sizeBytes: number;
  filename: string;
}

const MIN_CLIP_SECONDS = 10;
const MAX_CLIP_SECONDS = 300;

@Injectable()
export class ClipsService {
  private readonly logger = new Logger(ClipsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageService,
  ) {}

  // ------------------------------------------------------------------ agent

  /** Persist one clip candidate reported by the agent's save_clip tool. */
  async createFromAgent(
    projectId: string,
    chunkIndex: number,
    candidate: AgentClipCandidate,
  ): Promise<Clip> {
    const duration = candidate.end - candidate.start;
    if (
      candidate.start < 0 ||
      duration < MIN_CLIP_SECONDS ||
      duration > MAX_CLIP_SECONDS
    ) {
      throw new BadRequestException(
        `Clip range ${candidate.start}-${candidate.end} outside allowed duration ` +
          `${MIN_CLIP_SECONDS}-${MAX_CLIP_SECONDS}s`,
      );
    }

    const clipInfo: Prisma.InputJsonValue = {
      title: candidate.title,
      hook: candidate.hook,
      viralityScore: candidate.viralityScore,
      reason: candidate.reason,
      chunkIndex,
    };

    return this.prisma.clip.create({
      data: {
        projectId,
        start: candidate.start,
        end: candidate.end,
        state: ClipState.NOT_STARTED,
        clipInfo,
      },
    });
  }

  /**
   * Fan-in merge: drop lower-scored duplicates produced by overlapping
   * chunks. Returns how many clips were removed.
   */
  async dedupeProjectClips(projectId: string): Promise<number> {
    const clips = await this.prisma.clip.findMany({
      where: { projectId, state: ClipState.NOT_STARTED },
    });
    if (clips.length < 2) return 0;

    const withScores = clips.map((clip) => {
      const info = (clip.clipInfo ?? {}) as Record<string, unknown>;
      return {
        id: clip.id,
        start: clip.start,
        end: clip.end,
        viralityScore:
          typeof info.viralityScore === 'number' ? info.viralityScore : 0,
        chunkIndex: typeof info.chunkIndex === 'number' ? info.chunkIndex : 0,
      };
    });

    const duplicateIds = findDuplicateClipIds(withScores);
    if (duplicateIds.length > 0) {
      await this.prisma.clip.deleteMany({
        where: { id: { in: duplicateIds } },
      });
      this.logger.log(
        `Deduped ${duplicateIds.length} overlapping clip(s) for project ${projectId}`,
      );
    }
    return duplicateIds.length;
  }

  // ------------------------------------------------------------------ http

  async findByProjectForUser(
    userId: string,
    projectId: string,
  ): Promise<Clip[]> {
    await this.assertProjectOwnership(userId, projectId);
    return this.prisma.clip.findMany({
      where: { projectId },
      orderBy: { start: 'asc' },
    });
  }

  async findOneForUser(userId: string, clipId: string): Promise<Clip> {
    const clip = await this.prisma.clip.findFirst({
      where: {
        id: clipId,
        project: { application: { userId } },
      },
    });
    if (!clip) throw new NotFoundException('Clip not found');
    return clip;
  }

  async updateForUser(
    userId: string,
    clipId: string,
    dto: UpdateClipDto,
  ): Promise<Clip> {
    const clip = await this.findOneForUser(userId, clipId);
    const start = dto.start ?? clip.start;
    const end = dto.end ?? clip.end;
    if (end <= start) {
      throw new BadRequestException('Clip end must be greater than start');
    }

    const info = (clip.clipInfo ?? {}) as Record<string, unknown>;
    const rangeChanged = dto.start !== undefined || dto.end !== undefined;
    return this.prisma.clip.update({
      where: { id: clip.id },
      data: {
        start,
        end,
        clipInfo: {
          ...info,
          ...(dto.title ? { title: dto.title } : {}),
        } as Prisma.InputJsonValue,
        // user edits force a re-cut
        state: rangeChanged ? ClipState.NOT_STARTED : clip.state,
        clipPath: rangeChanged ? null : clip.clipPath,
      },
    });
  }

  async removeForUser(userId: string, clipId: string): Promise<void> {
    const clip = await this.findOneForUser(userId, clipId);
    await this.prisma.clip.delete({ where: { id: clip.id } });
  }

  /** Stream the cut clip file (available once state is READY). */
  async getStreamForUser(userId: string, clipId: string): Promise<ClipStream> {
    const clip = await this.findOneForUser(userId, clipId);
    if (!clip.clipPath) {
      throw new NotFoundException('Clip file is not available yet');
    }
    const absolute = this.storage.resolve(clip.clipPath);
    if (!(await this.storage.exists(absolute))) {
      throw new NotFoundException('Clip file is missing from storage');
    }
    const info = (clip.clipInfo ?? {}) as Record<string, unknown>;
    const title = typeof info.title === 'string' ? info.title : null;
    return {
      stream: this.storage.createReadStream(absolute),
      sizeBytes: await this.storage.sizeBytes(absolute),
      filename: `${title?.replace(/[^\w\- ]/g, '').trim() || clip.id}.mp4`,
    };
  }

  // ------------------------------------------------------------------ jobs

  async markState(
    clipIds: string[],
    state: ClipState,
    clipPath?: string | null,
  ): Promise<void> {
    await this.prisma.clip.updateMany({
      where: { id: { in: clipIds } },
      data: { state, ...(clipPath !== undefined ? { clipPath } : {}) },
    });
  }

  /** Clips the cron should pick up: pending cut, video downloaded. */
  async findCuttableClips(take = 25): Promise<Clip[]> {
    return this.prisma.clip.findMany({
      where: {
        state: ClipState.NOT_STARTED,
        project: {
          status: RecordStatus.ACTIVE,
          videoPath: { not: null },
        },
      },
      orderBy: { createdAt: 'asc' },
      take,
    });
  }

  async countByProject(projectId: string): Promise<number> {
    return this.prisma.clip.count({ where: { projectId } });
  }

  async countUnfinishedByProject(projectId: string): Promise<number> {
    return this.prisma.clip.count({
      where: {
        projectId,
        state: {
          in: [ClipState.NOT_STARTED, ClipState.PENDING, ClipState.CUTTING],
        },
      },
    });
  }

  private async assertProjectOwnership(
    userId: string,
    projectId: string,
  ): Promise<void> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, application: { userId } },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
  }
}
