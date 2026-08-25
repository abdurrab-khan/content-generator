import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_COLOR_GRADING } from '../../jobs/queues.constants.js';
import { ClipRendersController } from './clip-renders.controller.js';
import { ClipRendersService } from './clip-renders.service.js';
import { ColorGradingController } from './color-grading.controller.js';
import { ColorGradingService } from './color-grading.service.js';
import { RendersController } from './renders.controller.js';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_COLOR_GRADING })],
  controllers: [
    ColorGradingController,
    ClipRendersController,
    RendersController,
  ],
  providers: [ColorGradingService, ClipRendersService],
  exports: [ClipRendersService],
})
export class ColorGradingModule {}
