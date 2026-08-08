import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service.js';
import { PipelineState } from '../../generated/prisma/client.js';
import { AgentService } from '../../modules/agent/agent.service.js';
import { ClipsService } from '../../modules/clips/clips.service.js';
import { TranscriptsService } from '../../modules/transcripts/transcripts.service.js';
import type { AnalyzeChunkJobData, AnalyzeProjectJobData } from '../job-data.types.js';
import { PipelineService } from '../pipeline.service.js';
import { JOB_ANALYZE_CHUNK, JOB_ANALYZE_PROJECT, QUEUE_ANALYSIS } from '../queues.constants.js';

const CONCURRENCY = Number(process.env.ANALYSIS_CONCURRENCY) || 5;

/**
 * Analysis queue handles both roles of the fan-out flow:
 *  - `analyze-chunk`   (children, run in parallel with concurrency limit)
 *  - `analyze-project` (parent, runs once all children completed)
 */
@Processor(QUEUE_ANALYSIS, { concurrency: CONCURRENCY })
export class AnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalysisProcessor.name);

  constructor(
    private readonly agent: AgentService,
    private readonly transcripts: TranscriptsService,
    private readonly clips: ClipsService,
    private readonly pipeline: PipelineService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case JOB_ANALYZE_CHUNK:
        return this.analyzeChunk(job as Job<AnalyzeChunkJobData>);
      case JOB_ANALYZE_PROJECT:
        return this.finalizeProject(job as Job<AnalyzeProjectJobData>);
      default:
        throw new Error(`Unknown analysis job: ${job.name}`);
    }
  }

  private async analyzeChunk(job: Job<AnalyzeChunkJobData>) {
    const { projectId, chunkIndex } = job.data;
    try {
      const project = await this.prisma.project.findUniqueOrThrow({
        where: { id: projectId },
        select: { title: true, description: true },
      });
      const chunks = await this.transcripts.loadChunks(projectId);
      const chunk = chunks.find((candidate) => candidate.index === chunkIndex);
      if (!chunk) {
        throw new Error(`Chunk ${chunkIndex} not found for project ${projectId}`);
      }

      const result = await this.agent.analyzeChunk({
        projectId,
        projectTitle: project.title ?? 'Untitled',
        projectDescription: project.description,
        chunk,
      });
      this.logger.log(`Chunk ${chunkIndex} of ${projectId}: ${result.savedClips} clip(s) saved`);
      return result;
    } catch (error) {
      // BullMQ flows: the parent only runs when ALL children complete.
      // A permanently failing chunk must therefore "complete" (with 0 clips)
      // on its last attempt, otherwise one bad chunk would block the merge.
      const lastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      if (!lastAttempt) throw error;
      this.logger.error(
        `Chunk ${chunkIndex} of ${projectId} failed permanently: ${error}`,
      );
      return { savedClips: 0, failed: true };
    }
  }

  /** Parent flow job: all chunk children are done — merge & dedupe. */
  private async finalizeProject(job: Job<AnalyzeProjectJobData>) {
    const { projectId } = job.data;
    const childrenValues = await job.getChildrenValues<{ savedClips: number }>();
    const savedClips = Object.values(childrenValues).reduce(
      (total, value) => total + (value?.savedClips ?? 0),
      0,
    );

    const deduped = await this.clips.dedupeProjectClips(projectId);
    const total = await this.clips.countByProject(projectId);

    if (total === 0) {
      await this.pipeline.failProject(
        projectId,
        'The agent found no viral moments in this video.',
      );
    } else {
      await this.prisma.project.update({
        where: { id: projectId },
        data: { pipelineState: PipelineState.CLIPS_READY },
      });
    }

    this.logger.log(
      `Project ${projectId}: analysis done — ${savedClips} saved, ${deduped} deduped, ${total} total`,
    );
    return { savedClips, deduped, total };
  }
}
