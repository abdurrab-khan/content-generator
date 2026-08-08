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
import {
  ApplicationsService,
} from '../applications/applications.service.js';
import { SourceRegistryService } from '../sources/source-registry.service.js';
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
      throw new BadGatewayException('Could not reach the video source, try again later.');
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
        description: details.description?.slice(0, MAX_DESCRIPTION_LENGTH) ?? null,
        thumbnail: details.thumbnail,
        sourceVideoId: details.sourceVideoId,
        sourceInfo: details.raw,
        pipelineState: PipelineState.DETAILS_FETCHED,
      },
    });

    await this.pipeline.startPipeline(project.id);
    this.logger.log(`Project ${project.id} created, pipeline started (${dto.url})`);
    return project;
  }

  async findAllForUser(
    userId: string,
    query: ListProjectsQuery,
  ): Promise<{ items: Project[]; total: number; page: number; pageSize: number }> {
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
        clips: { orderBy: { start: 'asc' } },
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
}
