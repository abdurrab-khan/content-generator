import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  PipelineState,
  RecordStatus,
  type Project,
} from '../../generated/prisma/client.js';
import { PipelineService } from '../../jobs/pipeline.service.js';
import { ApplicationsService } from '../applications/applications.service.js';
import { SourceRegistryService } from '../sources/source-registry.service.js';
import { StorageFolder } from '../storage/interfaces/storage.interface.js';
import { LocalStorageService } from '../storage/providers/local-storage.service.js';
import type { CreateProjectDto, ListProjectsQuery } from './dto/project.dto.js';

const MAX_DESCRIPTION_LENGTH = 5000;

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sources: SourceRegistryService,
    private readonly applications: ApplicationsService,
    private readonly pipeline: PipelineService,
    private readonly storage: LocalStorageService,
  ) {}

  /**
   * Per the architecture diagram: fetch details synchronously (Found/Not
   * Found decision), then hand the heavy work (transcript, download,
   * analysis, cutting) to the background pipeline.
   */
  async create(userId: string, dto: CreateProjectDto): Promise<Project> {
    const provider = this.sources.getProviderForUrl(dto.url);
    if (!provider) {
      throw new BadRequestException(
        'Unsupported video URL. Currently supported: YouTube (watch/shorts/live).',
      );
    }

    const application = dto.applicationId
      ? await this.applications.findOwnedOrThrow(userId, dto.applicationId)
      : await this.applications.findDefaultForUser(userId);
    if (!application) {
      throw new NotFoundException(
        'No application found — create one first (or run the seed).',
      );
    }

    let details;
    try {
      details = await provider.getDetails(dto.url);
    } catch (error) {
      this.logger.error(`Failed to fetch video details: ${error}`);
      throw new BadGatewayException(
        'Could not reach the video source, try again later.',
      );
    }
    if (!details) {
      throw new NotFoundException('Video not found or unavailable.');
    }

    const project = await this.prisma.project.create({
      data: {
        applicationId: application.id,
        sourceType: provider.type,
        sourceUrl: dto.url,
        title: details.title,
        description:
          details.description?.slice(0, MAX_DESCRIPTION_LENGTH) ?? null,
        thumbnail: details.thumbnail,
        sourceVideoId: details.sourceVideoId,
        sourceInfo: details.raw,
        pipelineState: PipelineState.DETAILS_FETCHED,
      },
    });

    await this.pipeline.startPipeline(project.id);
    this.logger.log(
      `Project ${project.id} created, pipeline started (${dto.url})`,
    );
    return project;
  }

  async findAllForUser(
    userId: string,
    query: ListProjectsQuery,
  ): Promise<{
    items: Project[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const where = {
      application: { userId },
      status: query.status ?? RecordStatus.ACTIVE,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.project.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findOneForUser(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, application: { userId } },
      include: {
        clips: {
          orderBy: { start: 'asc' },
          include: {
            // Variants ride along so the Ready tab can group graded versions
            // under each video without extra requests.
            renders: {
              orderBy: { createdAt: 'asc' },
              include: {
                colorGradingPreset: { select: { id: true, name: true } },
              },
            },
          },
        },
        videos: { orderBy: { createdAt: 'desc' } },
        rawVideos: true,
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  /** Soft delete -> BIN (recoverable). */
  async removeForUser(userId: string, projectId: string): Promise<void> {
    await this.findOneForUser(userId, projectId);
    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: RecordStatus.BIN },
    });
  }

  /**
   * Restore from the bin -> ACTIVE. Note: the clip-cutting cron only picks
   * up clips of ACTIVE projects, so restoring a mid-pipeline project resumes
   * its remaining cuts automatically.
   */
  async restoreForUser(userId: string, projectId: string): Promise<Project> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, application: { userId } },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.status !== RecordStatus.BIN) {
      throw new BadRequestException('Only projects in the bin can be restored');
    }
    return this.prisma.project.update({
      where: { id: projectId },
      data: { status: RecordStatus.ACTIVE },
    });
  }

  /**
   * Permanent delete (only from the bin): removes the DB row — Prisma
   * cascades to clips, raw videos and videos — then best-effort deletes the
   * files from storage (source video, transcript, cut clips, final videos).
   */
  async permanentlyDeleteForUser(
    userId: string,
    projectId: string,
  ): Promise<void> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, application: { userId } },
      include: { clips: true, videos: true, rawVideos: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.status !== RecordStatus.BIN) {
      throw new BadRequestException(
        'Only projects in the bin can be permanently deleted',
      );
    }

    const paths = new Set<string>();
    if (project.transcriptPath) paths.add(project.transcriptPath);
    if (project.videoPath) paths.add(project.videoPath);
    for (const clip of project.clips) {
      if (clip.clipPath) paths.add(clip.clipPath);
    }
    for (const video of project.videos) {
      if (video.storagePath) paths.add(video.storagePath);
    }
    for (const rawVideo of project.rawVideos) {
      if (rawVideo.videoPath) paths.add(rawVideo.videoPath);
    }

    // Hard delete first (atomic) — cascades to clips, raw_videos, videos.
    await this.prisma.project.delete({ where: { id: project.id } });

    // File cleanup is best-effort: orphans on disk are preferable to a
    // half-deleted DB row, and failures here should not fail the request.
    for (const relativePath of paths) {
      try {
        await this.storage.remove(this.storage.resolve(relativePath));
      } catch (error) {
        this.logger.warn(`Failed to remove file "${relativePath}": ${error}`);
      }
    }

    // The per-project transcript folder accumulates provider artifacts beyond
    // the stored transcriptPath (e.g. transcript.en-orig.vtt) — remove it whole.
    try {
      await this.storage.removeDirRecursive(
        this.storage.resolve(StorageFolder.TRANSCRIPTS, projectId),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to remove transcript dir for ${projectId}: ${error}`,
      );
    }

    this.logger.log(
      `Project ${projectId} permanently deleted (${paths.size} file(s) cleaned)`,
    );
  }
}
