import { Module } from '@nestjs/common';
import { ClipsController } from './clips.controller.js';
import { ClipsService } from './clips.service.js';

@Module({
  controllers: [ClipsController],
  providers: [ClipsService],
  exports: [ClipsService],
})
export class ClipsModule {}
