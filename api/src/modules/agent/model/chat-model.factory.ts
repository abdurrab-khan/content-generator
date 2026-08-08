import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatDeepSeek } from '@langchain/deepseek';
import type { Env } from '../../../config/env.schema.js';

/**
 * Single place that knows which LLM we use. Swap providers by changing
 * this factory (or make it config-driven) — the agent never changes.
 */
@Injectable()
export class ChatModelFactory {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly temperature: number;

  constructor(config: ConfigService<Env, true>) {
    this.apiKey = config.get('DEEPSEEK_API_KEY', { infer: true });
    this.model = config.get('AI_MODEL', { infer: true });
    this.temperature = config.get('AI_TEMPERATURE', { infer: true });
  }

  create(): BaseChatModel {
    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY is not configured');
    }
    return new ChatDeepSeek({
      apiKey: this.apiKey,
      model: this.model,
      temperature: this.temperature,
      maxRetries: 2,
    });
  }
}
