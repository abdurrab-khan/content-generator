import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './auth.js';
import { CommonModule } from './common/common.module.js';
import { validateEnv, type Env } from './config/env.schema.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { AgentModule } from './modules/agent/agent.module.js';
import { ApplicationsModule } from './modules/applications/applications.module.js';
import { ClipsModule } from './modules/clips/clips.module.js';
import { ColorGradingModule } from './modules/color-grading/color-grading.module.js';
import { DiscoveryModule } from './modules/discovery/discovery.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { RawVideosModule } from './modules/raw-videos/raw-videos.module.js';
import { SourcesModule } from './modules/sources/sources.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { TranscriptsModule } from './modules/transcripts/transcripts.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { VideosModule } from './modules/videos/videos.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      cache: true,
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: {
          host: config.get('REDIS_HOST', { infer: true }),
          port: config.get('REDIS_PORT', { infer: true }),
        },
      }),
    }),
    DatabaseModule,
    StorageModule,
    CommonModule,
    AuthModule.forRoot({ auth }),
    HealthModule,
    UsersModule,
    ApplicationsModule,
    ProjectsModule,
    ClipsModule,
    ColorGradingModule,
    DiscoveryModule,
    VideosModule,
    RawVideosModule,
    SourcesModule,
    TranscriptsModule,
    AgentModule,
    MediaModule,
    JobsModule,
  ],
})
export class AppModule {}
