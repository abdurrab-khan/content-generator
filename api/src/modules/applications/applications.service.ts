import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  PodcastLanguage,
  type Application,
} from '../../generated/prisma/client.js';
import type { CreateApplicationDto } from './dto/create-application.dto.js';

export const DEFAULT_APPLICATION_NAME = 'podcast-clips';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(userId: string): Promise<Application[]> {
    return this.prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOwnedOrThrow(
    userId: string,
    applicationId: string,
  ): Promise<Application> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
    });
    if (!application) throw new NotFoundException('Application not found');
    return application;
  }

  /** The user's default app ("podcast-clips", seeded) — used when none is passed. */
  async findDefaultForUser(userId: string): Promise<Application | null> {
    return this.prisma.application.findFirst({
      where: { userId, name: DEFAULT_APPLICATION_NAME, isActive: true },
    });
  }

  createForUser(
    userId: string,
    dto: CreateApplicationDto,
  ): Promise<Application> {
    return this.prisma.application.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        language: PodcastLanguage[dto.language],
      },
    });
  }
}
