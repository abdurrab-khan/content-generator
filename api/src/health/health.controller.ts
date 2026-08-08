import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import {
  BinariesHealthIndicator,
  DatabaseHealthIndicator,
  RedisHealthIndicator,
} from './health.indicators.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly binaries: BinariesHealthIndicator,
  ) {}

  @Get()
  @AllowAnonymous()
  @HealthCheck()
  @ApiOperation({
    summary: 'Liveness/readiness: database, redis, yt-dlp & ffmpeg binaries',
  })
  check() {
    return this.health.check([
      () => this.database.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
      () => this.binaries.isHealthy('binaries'),
    ]);
  }
}
