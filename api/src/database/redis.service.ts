import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.schema.js';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

@Injectable()
export class RedisService
  extends Redis
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService<Env, true>) {
    super({
      host: config.get('REDIS_HOST', { infer: true }),
      port: config.get('REDIS_PORT', { infer: true }),
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // fail fast for health checks
      lazyConnect: true,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.connect();
    await this.ping();
  }

  onModuleDestroy() {
    this?.disconnect();
  }
}
