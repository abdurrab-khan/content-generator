import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGroq } from '@langchain/groq';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Env } from '../../../config/env.schema.js';

/**
 * Single place that knows which LLM we use. Swap providers by changing
 * this factory (or make it config-driven) — the agent never changes.
 */
@Injectable()
export class ChatModelFactory {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly temperature: number;

  constructor(config: ConfigService<Env, true>) {
    this.apiKey = config.get('MODEL_API_KEY', { infer: true });
    this.model = config.get('AI_MODEL', { infer: true });
    this.baseUrl = config.get('MODEL_BASE_URL', { infer: true });
    this.temperature = config.get('AI_TEMPERATURE', { infer: true });
  }

  create(): BaseChatModel {
    if (!this.apiKey) {
      throw new Error('API key is not configured');
    }

    // const model = new ChatOpenAI({
    //   maxRetries: 2,
    //   apiKey: this.apiKey,
    //   model: this.model,
    //   temperature: this.temperature,
    //   configuration: { baseURL: this.baseUrl },
    // });

    const model = new ChatGroq({
      apiKey: this.apiKey,
      model: this.model,
      temperature: this.temperature,
    });

    return model;
  }
}
