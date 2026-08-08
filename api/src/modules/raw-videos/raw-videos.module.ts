import { Module } from '@nestjs/common';
import { RawVideosController } from './raw-videos.controller.js';
import { RawVideosService } from './raw-videos.service.js';

@Module({
  controllers: [RawVideosController],
  providers: [RawVideosService],
  exports: [RawVideosService],
})
export class RawVideosModule {}
