import { Injectable, NotFoundException } from '@nestjs/common';
import type { Readable } from 'node:stream';
import { PrismaService } from '../../database/prisma.service.js';
import {
  RecordStatus,
  type Clip,
  type Video,
} from '../../generated/prisma/client.js';
import { LocalStorageService } from '../storage/providers/local-storage.service.js';

export interface VideoStream {
  stream: Readable;
  sizeBytes: number;
  filename: string;
}

@Injectable()
export class VideosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageService,
  ) {}

  // ------------------------------------------------------------------ jobs

  /** Create the final Video record for a freshly cut clip. */
  async createFromClip(clip: Clip, storagePath: string, durationSeconds: number): Promise<Video> {
    const info = (clip.clipInfo ?? {}) as Record<string, unknown>;
    return this.prisma.video.create({
      data: {
        projectId: clip.projectId,
        clipId: clip.id,
        title: typeof info.title === 'string' ? info.title : `Clip ${clip.id}`,
        description: typeof info.hook === 'string' ? info.hook : null,
        tags: [],
        storagePath,
        duration: durationSeconds,
      },
    });
  }

  // ------------------------------------------------------------------ http

  async findAllForUser(userId: string): Promise<Video[]> {
    return this.prisma.video.findMany({
      where: { project: { application: { userId } }, status: RecordStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForUser(userId: string, videoId: string): Promise<Video> {
    const video = await this.prisma.video.findFirst({
      where: { id: videoId, project: { application: { userId } } },
    });
    if (!video) throw new NotFoundException('Video not found');
    return video;
  }

  async getStreamForUser(userId: string, videoId: string): Promise<VideoStream> {
    const video = await this.findOneForUser(userId, videoId);
    if (!video.storagePath) {
      throw new NotFoundException('Video file is not available yet');
    }
    const absolute = this.storage.resolve(video.storagePath);
    if (!(await this.storage.exists(absolute))) {
      throw new NotFoundException('Video file is missing from storage');
    }
    return {
      stream: this.storage.createReadStream(absolute),
      sizeBytes: await this.storage.sizeBytes(absolute),
      filename: `${video.title?.replace(/[^\w\- ]/g, '').trim() || video.id}.mp4`,
    };
  }
}
