import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env.schema.js';
import type { IStorageService } from '../interfaces/storage.interface.js';

@Injectable()
export class LocalStorageService implements IStorageService, OnModuleInit {
  private readonly root: string;

  constructor(config: ConfigService<Env, true>) {
    this.root = path.resolve(config.get('STORAGE_ROOT', { infer: true }));
  }

  async onModuleInit(): Promise<void> {
    await this.ensureDir();
  }

  resolve(...segments: string[]): string {
    const resolved = path.resolve(this.root, ...segments);
    if (!resolved.startsWith(this.root + path.sep) && resolved !== this.root) {
      throw new Error(`Path escapes storage root: ${resolved}`);
    }
    return resolved;
  }

  async ensureDir(...segments: string[]): Promise<string> {
    const dir = this.resolve(...segments);
    await mkdir(dir, { recursive: true });
    return dir;
  }

  async writeText(absolutePath: string, content: string): Promise<void> {
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, 'utf8');
  }

  async readText(absolutePath: string): Promise<string> {
    return readFile(absolutePath, 'utf8');
  }

  async exists(absolutePath: string): Promise<boolean> {
    try {
      await stat(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  createReadStream(absolutePath: string): Readable {
    return createReadStream(absolutePath);
  }

  async sizeBytes(absolutePath: string): Promise<number> {
    return (await stat(absolutePath)).size;
  }

  async remove(absolutePath: string): Promise<void> {
    await unlink(absolutePath).catch(() => undefined);
  }

  relative(absolutePath: string): string {
    return path.relative(this.root, absolutePath);
  }
}
