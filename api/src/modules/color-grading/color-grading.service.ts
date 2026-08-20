import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  RecordStatus,
  type ColorGradingPreset,
} from '../../generated/prisma/client.js';

/** Read access to the shared color grading preset catalog. */
@Injectable()
export class ColorGradingService {
  constructor(private readonly prisma: PrismaService) {}

  /** All active presets — global catalog, visible to every user. */
  async listPresets(): Promise<ColorGradingPreset[]> {
    return this.prisma.colorGradingPreset.findMany({
      where: { status: RecordStatus.ACTIVE },
      orderBy: { name: 'asc' },
    });
  }
}
