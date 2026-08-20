import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
}
