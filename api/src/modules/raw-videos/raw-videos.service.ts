import type { Readable } from 'node:stream';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  DownloadState,
  type Prisma,
  type RawVideo,
} from '../../generated/prisma/client.js';
import { LocalStorageService } from '../storage/providers/local-storage.service.js';

export interface RawVideoStream {
  stream: Readable;
  sizeBytes: number;
  filename: string;
}

@Injectable()
export class RawVideosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageService,
  ) {}

  createForProject(
    projectId: string,
    data: {
      title: string | null;
      description: string | null;
      podcastInfo: Prisma.InputJsonValue | undefined;
    },
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

  async findByProjectForUser(
    userId: string,
    projectId: string,
  ): Promise<RawVideo[]> {
    const owned = await this.prisma.project.findFirst({
      where: { id: projectId, application: { userId } },
      select: { id: true },
    });
    if (!owned) throw new NotFoundException('Project not found');
    return this.prisma.rawVideo.findMany({ where: { projectId } });
  }

  async findOneForUser(userId: string, rawVideoId: string): Promise<RawVideo> {
    const rawVideo = await this.prisma.rawVideo.findFirst({
      where: { id: rawVideoId, project: { application: { userId } } },
    });
    if (!rawVideo) throw new NotFoundException('Raw video not found');
    return rawVideo;
  }

  /** Stream the downloaded source file (available once DOWNLOADED). */
  async getStreamForUser(
    userId: string,
    rawVideoId: string,
  ): Promise<RawVideoStream> {
    const rawVideo = await this.findOneForUser(userId, rawVideoId);
    if (!rawVideo.videoPath) {
      throw new NotFoundException('Raw video file is not available yet');
    }
    const absolute = this.storage.resolve(rawVideo.videoPath);
    if (!(await this.storage.exists(absolute))) {
      throw new NotFoundException('Raw video file is missing from storage');
    }
    return {
      stream: this.storage.createReadStream(absolute),
      sizeBytes: await this.storage.sizeBytes(absolute),
      filename: `${rawVideo.title?.replace(/[^\w\- ]/g, '').trim() || rawVideo.id}.mp4`,
    };
  }
}
