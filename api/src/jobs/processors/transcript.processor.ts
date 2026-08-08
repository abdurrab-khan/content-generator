import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { FlowProducer, type Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service.js';
import { PipelineState } from '../../generated/prisma/client.js';
import { TranscriptsService } from '../../modules/transcripts/transcripts.service.js';
import type {
  AnalyzeChunkJobData,
  AnalyzeProjectJobData,
  TranscriptJobData,
} from '../job-data.types.js';
import { PipelineService } from '../pipeline.service.js';
import {
  JOB_ANALYZE_CHUNK,
  JOB_ANALYZE_PROJECT,
  QUEUE_ANALYSIS,
  QUEUE_TRANSCRIPT,
} from '../queues.constants.js';

/**
 * Transcript track: fetch subtitles -> chunk -> fan out one analysis child
 * job per chunk (BullMQ flow) with a parent job that merges the results.
 */
@Processor(QUEUE_TRANSCRIPT)
export class TranscriptProcessor extends WorkerHost {
  private readonly logger = new Logger(TranscriptProcessor.name);

  constructor(
    private readonly transcripts: TranscriptsService,
    private readonly pipeline: PipelineService,
    private readonly flowProducer: FlowProducer,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<TranscriptJobData>): Promise<{ chunks: number }> {
    const { projectId } = job.data;
    try {
      const result = await this.transcripts.fetchAndChunk(projectId);

      if (!result || result.chunks.length === 0) {
        await this.pipeline.failProject(
          projectId,
          'No subtitles/transcript available for this video.',
        );
        return { chunks: 0 };
      }

      await this.flowProducer.add({
        name: JOB_ANALYZE_PROJECT,
        queueName: QUEUE_ANALYSIS,
        data: { projectId } satisfies AnalyzeProjectJobData,
        children: result.chunks.map((chunk) => ({
          name: JOB_ANALYZE_CHUNK,
          queueName: QUEUE_ANALYSIS,
          data: {
            projectId,
            chunkIndex: chunk.index,
          } satisfies AnalyzeChunkJobData,
          opts: {
            attempts: 2,
            backoff: { type: 'exponential', delay: 10_000 },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        })),
        opts: { removeOnComplete: 100, removeOnFail: 500 },
      });

      await this.prisma.project.update({
        where: { id: projectId },
        data: { pipelineState: PipelineState.ANALYZING },
      });

      this.logger.log(
        `Project ${projectId}: fanned out ${result.chunks.length} chunk(s)`,
      );
      return { chunks: result.chunks.length };
    } catch (error) {
      const lastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      if (lastAttempt) {
        await this.pipeline.failProject(
          projectId,
          error instanceof Error ? error.message : 'Transcript fetch failed',
        );
      }
      throw error;
    }
  }
}
