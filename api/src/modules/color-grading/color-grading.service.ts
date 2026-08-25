import type { Readable } from 'node:stream';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  RecordStatus,
  type ColorGradingPreset,
} from '../../generated/prisma/client.js';
import { LocalStorageService } from '../storage/providers/local-storage.service.js';

export interface PresetPreviewStream {
  stream: Readable;
  sizeBytes: number;
}

/** Read access to the shared color grading preset catalog. */
@Injectable()
export class ColorGradingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageService,
  ) {}

  /** All active presets — global catalog, visible to every user. */
  async listPresets(): Promise<ColorGradingPreset[]> {
    return this.prisma.colorGradingPreset.findMany({
      where: { status: RecordStatus.ACTIVE },
      orderBy: { name: 'asc' },
    });
  }

  /** Stream the preset's short graded preview loop (generated offline). */
  async getPreviewStream(presetId: string): Promise<PresetPreviewStream> {
    const preset = await this.prisma.colorGradingPreset.findUnique({
      where: { id: presetId },
    });
    if (!preset || preset.status !== RecordStatus.ACTIVE) {
      throw new NotFoundException('Preset not found');
    }
    if (!preset.previewPath) {
      throw new NotFoundException(
        'Preview not generated yet — run pnpm db:generate-previews',
      );
    }
    const absolute = this.storage.resolve(preset.previewPath);
    if (!(await this.storage.exists(absolute))) {
      throw new NotFoundException('Preview file is missing from storage');
    }
    return {
      stream: this.storage.createReadStream(absolute),
      sizeBytes: await this.storage.sizeBytes(absolute),
    };
  }
}

