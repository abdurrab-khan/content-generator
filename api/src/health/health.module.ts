import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { MediaModule } from '../modules/media/media.module.js';
import { SourcesModule } from '../modules/sources/sources.module.js';
import { HealthController } from './health.controller.js';
import {
  BinariesHealthIndicator,
  DatabaseHealthIndicator,
  RedisHealthIndicator,
} from './health.indicators.js';

@Module({
  imports: [TerminusModule, SourcesModule, MediaModule],
  controllers: [HealthController],
  providers: [DatabaseHealthIndicator, RedisHealthIndicator, BinariesHealthIndicator],
})
export class HealthModule {}
