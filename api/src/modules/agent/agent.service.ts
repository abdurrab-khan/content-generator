import { Injectable, Logger } from '@nestjs/common';
import { createAgent } from 'langchain';
import { secondsToTimestamp } from '../../common/utils/time.utils.js';
import type { TranscriptChunk } from '../transcripts/chunking.service.js';
import { ChatModelFactory } from './model/chat-model.factory.js';
import { PromptsService } from './prompts/prompts.service.js';
import { AnalysisToolsFactory } from './tools/analysis-tools.factory.js';

export interface AnalyzeChunkInput {
  projectId: string;
  projectTitle: string;
  projectDescription: string | null;
  chunk: TranscriptChunk;
}

export interface AnalyzeChunkResult {
  savedClips: number;
}

/**
 * Runs the viral-moment agent over one transcript chunk.
 *
 * Built with LangChain v1 `createAgent` (a LangGraph graph under the hood):
 * model + tools + system prompt are all injected, so any of them can be
 * swapped without touching the pipeline.
 */
@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly modelFactory: ChatModelFactory,
    private readonly prompts: PromptsService,
    private readonly toolsFactory: AnalysisToolsFactory,
  ) {}

  async analyzeChunk(input: AnalyzeChunkInput): Promise<AnalyzeChunkResult> {
    const { chunk } = input;
    const [systemPrompt, model] = [
      await this.prompts.getViralClipsSystemPrompt(),
      this.modelFactory.create(),
    ];
    const { tools, getSavedCount } = this.toolsFactory.build({
      projectId: input.projectId,
      projectTitle: input.projectTitle,
      projectDescription: input.projectDescription,
      chunkIndex: chunk.index,
      chunkStartSeconds: chunk.startSeconds,
      chunkEndSeconds: chunk.endSeconds,
    });

    const agent = createAgent({ model, tools, systemPrompt });

    this.logger.log(
      `Analyzing chunk ${chunk.index} ` +
        `(${secondsToTimestamp(chunk.startSeconds)}-${secondsToTimestamp(chunk.endSeconds)}) ` +
        `of project ${input.projectId}`,
    );

    await agent.invoke({
      messages: [{ role: 'user', content: this.buildUserMessage(input) }],
    });

    return { savedClips: getSavedCount() };
  }

  private buildUserMessage(input: AnalyzeChunkInput): string {
    return [
      `Podcast: ${input.projectTitle}`,
      '',
      `Transcript chunk window: ${secondsToTimestamp(input.chunk.startSeconds)} - ${secondsToTimestamp(
        input.chunk.endSeconds,
      )} (chunk #${input.chunk.index})`,
      '',
      'Transcript chunk (lines are prefixed with absolute [HH:MM:SS] timestamps):',
      input.chunk.text,
    ].join('\n');
  }
}
