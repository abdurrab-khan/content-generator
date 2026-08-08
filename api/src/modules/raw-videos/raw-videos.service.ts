import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  DownloadState,
  type Prisma,
  type RawVideo,
} from '../../generated/prisma/client.js';

@Injectable()
export class RawVideosService {
  constructor(private readonly prisma: PrismaService) {}

  createForProject(
    projectId: string,
    data: { title: string | null; description: string | null; podcastInfo: Prisma.InputJsonValue | undefined },
  ): Promise<RawVideo> {
    return this.prisma.rawVideo.create({
      data: {
        projectId,
        title: data.title,
        description: data.description,
        podcastInfo: data.podcastInfo,
        tags: [],
        downloadState: DownloadState.DOWNLOADING,
      },
    });
  }

  async markDownloaded(projectId: string, videoPath: string): Promise<void> {
    await this.prisma.rawVideo.updateMany({
      where: { projectId, downloadState: DownloadState.DOWNLOADING },
      data: { downloadState: DownloadState.DOWNLOADED, videoPath },
    });
  }

  async markFailed(projectId: string): Promise<void> {
    await this.prisma.rawVideo.updateMany({
      where: { projectId, downloadState: DownloadState.DOWNLOADING },
      data: { downloadState: DownloadState.FAILED },
    });
  }

  async findByProjectForUser(userId: string, projectId: string): Promise<RawVideo[]> {
    const owned = await this.prisma.project.findFirst({
      where: { id: projectId, application: { userId } },
      select: { id: true },
    });
    if (!owned) throw new NotFoundException('Project not found');
    return this.prisma.rawVideo.findMany({ where: { projectId } });
  }
}
