import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ColorGradingService } from './color-grading.service.js';

@ApiTags('color-grading')
@Controller('color-grading')
export class ColorGradingController {
  constructor(private readonly colorGrading: ColorGradingService) {}

  @Get('presets')
  @ApiOperation({ summary: 'List available color grading presets' })
  listPresets() {
    return this.colorGrading.listPresets();
  }

  @Get('presets/:id/preview')
  @ApiOperation({
    summary: 'Stream the preset preview loop',
    description:
      'Short muted graded clip shown on the preset card. Previews are ' +
      'stable per preset, so they are cacheable.',
  })
  async streamPreview(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { stream, sizeBytes } = await this.colorGrading.getPreviewStream(id);
    response.set({
      'Content-Type': 'video/mp4',
      'Content-Length': sizeBytes,
      'Cache-Control': 'public, max-age=86400',
    });
    return new StreamableFile(stream);
  }
}
