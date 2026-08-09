import type { Readable } from 'node:stream';

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

/** Well-known top-level folders inside the storage root. */
export const StorageFolder = {
  VIDEOS: 'videos',
  TRANSCRIPTS: 'transcripts',
  CLIPS: 'clips',
  OUTPUTS: 'outputs',
} as const;
export type StorageFolder = (typeof StorageFolder)[keyof typeof StorageFolder];

/**
 * Storage abstraction. Local disk today; S3-compatible storage later —
 * swap the provider binding in StorageModule, nothing else changes.
 *
 * All paths handled by implementations are absolute paths inside the
 * storage root; DB stores paths relative to the root for portability.
 */
export interface IStorageService {
  /** Absolute path for `segments` joined under the root (no existence check). */
  resolve(...segments: string[]): string;
  /** Creates the directory (recursive) and returns its absolute path. */
  ensureDir(...segments: string[]): Promise<string>;
  writeText(absolutePath: string, content: string): Promise<void>;
  readText(absolutePath: string): Promise<string>;
  exists(absolutePath: string): Promise<boolean>;
  createReadStream(absolutePath: string): Readable;
  sizeBytes(absolutePath: string): Promise<number>;
  remove(absolutePath: string): Promise<void>;
  /** Removes a directory only when empty (shared dirs fail harmlessly). */
  removeDirIfEmpty(absolutePath: string): Promise<void>;
  /** Recursively removes a directory tree (e.g. a per-project folder). */
  removeDirRecursive(absolutePath: string): Promise<void>;
  /** Path relative to the storage root (what we persist in the DB). */
  relative(absolutePath: string): string;
}
