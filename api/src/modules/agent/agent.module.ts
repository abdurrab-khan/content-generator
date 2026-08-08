import { Module } from '@nestjs/common';
import { ClipsModule } from '../clips/clips.module.js';
import { AgentService } from './agent.service.js';
import { ChatModelFactory } from './model/chat-model.factory.js';
import { PromptsService } from './prompts/prompts.service.js';
import { AnalysisToolsFactory } from './tools/analysis-tools.factory.js';

@Module({
  imports: [ClipsModule],
  providers: [AgentService, ChatModelFactory, PromptsService, AnalysisToolsFactory],
  exports: [AgentService],
})
export class AgentModule {}
