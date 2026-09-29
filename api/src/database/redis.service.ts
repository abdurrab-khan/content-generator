import { Redis } from 'ioredis';
import { Env } from '../config/env.schema.js';
import { ConfigService } from '@nestjs/config';
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
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: () => null, // fail fast for health checks
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
