import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env.schema.js';

const PROMPT_FILE = 'viral-clips.system.md';
const PROMPT_START_MARKER = /-->\s*([\s\S]*)$/;

/**
 * Loads the viral-clips system prompt from disk. The .md file may start
 * with an HTML comment (docs/instructions) which is stripped.
 * In dev the file is re-read on every call so prompt edits are instant.
 */
@Injectable()
export class PromptsService implements OnModuleInit {
  private readonly logger = new Logger(PromptsService.name);
  private readonly isDev: boolean;
  private cachedPrompt: string | null = null;

  constructor(config: ConfigService<Env, true>) {
    this.isDev = config.get('NODE_ENV', { infer: true }) !== 'production';
  }

  async onModuleInit(): Promise<void> {
    this.cachedPrompt = await this.readPromptFile();
    this.logger.log(`Loaded system prompt (${this.cachedPrompt.length} chars)`);
  }

  async getViralClipsSystemPrompt(): Promise<string> {
    if (this.isDev || this.cachedPrompt === null) {
      this.cachedPrompt = await this.readPromptFile();
    }
    return this.cachedPrompt;
  }

  private async readPromptFile(): Promise<string> {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const raw = await readFile(path.join(here, PROMPT_FILE), 'utf8');
    const match = PROMPT_START_MARKER.exec(raw);
    const prompt = (match ? match[1] : raw).trim();
    if (prompt.length === 0) {
      throw new Error(`${PROMPT_FILE} is empty — paste your system prompt`);
    }
    return prompt;
  }
}
