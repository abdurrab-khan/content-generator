import { Module } from '@nestjs/common';
import { SourcesModule } from '../sources/sources.module.js';
import { ChunkingService } from './chunking.service.js';
import { TranscriptsService } from './transcripts.service.js';

@Module({
  imports: [SourcesModule],
  providers: [TranscriptsService, ChunkingService],
  exports: [TranscriptsService, ChunkingService],
})
export class TranscriptsModule {}
