import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { FlowProducer } from 'bullmq';
import type { Env } from '../config/env.schema.js';
import { AgentModule } from '../modules/agent/agent.module.js';
import { ClipsModule } from '../modules/clips/clips.module.js';
import { MediaModule } from '../modules/media/media.module.js';
import { RawVideosModule } from '../modules/raw-videos/raw-videos.module.js';
import { SourcesModule } from '../modules/sources/sources.module.js';
import { TranscriptsModule } from '../modules/transcripts/transcripts.module.js';
import { VideosModule } from '../modules/videos/videos.module.js';
import { ClipCuttingCron } from './cron/clip-cutting.cron.js';
import { PipelineService } from './pipeline.service.js';
import { AnalysisProcessor } from './processors/analysis.processor.js';
import { ClipCuttingProcessor } from './processors/clip-cutting.processor.js';
import { TranscriptProcessor } from './processors/transcript.processor.js';
import { VideoDownloadProcessor } from './processors/video-download.processor.js';
import {
  QUEUE_ANALYSIS,
  QUEUE_CLIP_CUTTING,
  QUEUE_TRANSCRIPT,
  QUEUE_VIDEO_DOWNLOAD,
} from './queues.constants.js';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_TRANSCRIPT },
      { name: QUEUE_VIDEO_DOWNLOAD },
      { name: QUEUE_ANALYSIS },
      { name: QUEUE_CLIP_CUTTING },
    ),
    TranscriptsModule,
    AgentModule,
    ClipsModule,
    VideosModule,
    RawVideosModule,
    SourcesModule,
    MediaModule,
  ],
  providers: [
    {
      provide: FlowProducer,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new FlowProducer({
          connection: {
            host: config.get('REDIS_HOST', { infer: true }),
            port: config.get('REDIS_PORT', { infer: true }),
          },
        }),
    },
    PipelineService,
    TranscriptProcessor,
    VideoDownloadProcessor,
    AnalysisProcessor,
    ClipCuttingProcessor,
    ClipCuttingCron,
  ],
  exports: [PipelineService],
})
export class JobsModule {}
