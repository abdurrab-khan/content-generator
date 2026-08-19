import 'dotenv/config';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  ClipState,
  PrismaClient,
  type Clip,
} from '../src/generated/prisma/client.js';
import { findDuplicateClipIds } from '../src/modules/clips/clip-merge.utils.js';

/**
 * One-off cleanup for duplicate clips created before the pipeline idempotency
 * fixes: retried chunk analyses re-saved identical moments, and the cutting
 * cron swept them before the fan-in dedupe could run.
 *
 * Two passes:
 *  1. Exact duplicates — same project + same start + same end (matching the
 *     exact-match guard in ClipsService.createFromAgent). The keeper is the
 *     most useful copy (a cut READY clip beats an uncut one; ties go to the
 *     earliest created).
 *  2. Near duplicates among the surviving READY clips — the same cross-chunk
 *     overlap rule the fan-in dedupe would have applied (findDuplicateClipIds).
 *     Restricted to READY clips so nothing queued or mid-cut is touched.
 *
 * Every dropped clip is deleted together with its linked Video rows and any
 * files no surviving row references.
 *
 * Usage (from api/):
 *   pnpm db:cleanup-dupes            # dry run — prints what would be deleted
 *   pnpm db:cleanup-dupes -- --apply
 */

const APPLY = process.argv.includes('--apply');

/** Prefer clips that are furthest along the cutting pipeline. */
const STATE_RANK: Record<ClipState, number> = {
  [ClipState.READY]: 0,
  [ClipState.CUTTING]: 1,
  [ClipState.PENDING]: 2,
  [ClipState.NOT_STARTED]: 3,
  [ClipState.FAILED]: 4,
};

function pickKeeper(group: Clip[]): Clip {
  return [...group].sort(
    (a, b) =>
      STATE_RANK[a.state] - STATE_RANK[b.state] ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  )[0];
}

function infoOf(clip: Clip): Record<string, unknown> {
  return (clip.clipInfo ?? {}) as Record<string, unknown>;
}

function titleOf(clip: Clip): string {
  const title = infoOf(clip).title;
  return typeof title === 'string' ? title : '(untitled)';
}

function numberInfo(clip: Clip, key: string): number {
  const value = infoOf(clip)[key];
  return typeof value === 'number' ? value : 0;
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  const storageRoot = path.resolve(process.env.STORAGE_ROOT ?? './storage');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const clips = await prisma.clip.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const groups = new Map<string, Clip[]>();
    for (const clip of clips) {
      const key = `${clip.projectId}|${clip.start}|${clip.end}`;
      const group = groups.get(key) ?? [];
      group.push(clip);
      groups.set(key, group);
    }

    const doomed = new Map<string, Clip>();

    // ---- Pass 1: exact duplicates (same start AND end) --------------------
    let exactGroups = 0;
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      exactGroups += 1;
      const keeper = pickKeeper(group);
      console.log(
        `\nproject=${keeper.projectId}  ${keeper.start}-${keeper.end}s  "${titleOf(keeper)}"`,
      );
      console.log(`  keep  ${keeper.id} [${keeper.state}]`);
      for (const clip of group) {
        if (clip.id === keeper.id) continue;
        doomed.set(clip.id, clip);
        console.log(`  drop  ${clip.id} [${clip.state}]`);
      }
    }

    // ---- Pass 2: cross-chunk near duplicates (READY clips only) -----------
    const readyByProject = new Map<string, Clip[]>();
    for (const clip of clips) {
      if (doomed.has(clip.id) || clip.state !== ClipState.READY) continue;
      const projectClips = readyByProject.get(clip.projectId) ?? [];
      projectClips.push(clip);
      readyByProject.set(clip.projectId, projectClips);
    }

    let nearGroups = 0;
    for (const [projectId, projectClips] of readyByProject) {
      if (projectClips.length < 2) continue;
      const dropIds = findDuplicateClipIds(
        projectClips.map((clip) => ({
          id: clip.id,
          start: clip.start,
          end: clip.end,
          viralityScore: numberInfo(clip, 'viralityScore'),
          chunkIndex: numberInfo(clip, 'chunkIndex'),
        })),
      );
      if (dropIds.length === 0) continue;
      nearGroups += 1;
      console.log(
        `\nproject=${projectId}  near duplicates (overlapping chunks)`,
      );
      for (const id of dropIds) {
        const clip = projectClips.find((candidate) => candidate.id === id);
        if (!clip) continue;
        doomed.set(clip.id, clip);
        console.log(
          `  drop  ${clip.id} [${clip.state}]  ${clip.start}-${clip.end}s  "${titleOf(clip)}"`,
        );
      }
    }

    if (doomed.size === 0) {
      console.log('No duplicate clips found — nothing to do.');
      return;
    }

    // ---- Collect linked videos + files ------------------------------------
    // Video.clipId is a plain column (no FK cascade), so match in memory.
    const allVideos = await prisma.video.findMany();
    const doomedVideos = allVideos.filter(
      (video) => video.clipId !== null && doomed.has(video.clipId),
    );

    // A file is only removed when no surviving clip/video still references it.
    const survivorPaths = new Set<string>();
    for (const clip of clips) {
      if (!doomed.has(clip.id) && clip.clipPath) {
        survivorPaths.add(clip.clipPath);
      }
    }
    for (const video of allVideos) {
      const isDoomed = video.clipId !== null && doomed.has(video.clipId);
      if (!isDoomed && video.storagePath) survivorPaths.add(video.storagePath);
    }

    const doomedPaths = new Set<string>();
    for (const clip of doomed.values()) {
      if (clip.clipPath && !survivorPaths.has(clip.clipPath)) {
        doomedPaths.add(clip.clipPath);
      }
    }
    for (const video of doomedVideos) {
      if (video.storagePath && !survivorPaths.has(video.storagePath)) {
        doomedPaths.add(video.storagePath);
      }
    }

    console.log(
      `\n${exactGroups} exact + ${nearGroups} near-duplicate group(s): ` +
        `${doomed.size} clip(s) + ${doomedVideos.length} video(s) + ` +
        `${doomedPaths.size} file(s) ` +
        (APPLY ? 'to delete.' : 'would be deleted.'),
    );

    if (!APPLY) {
      console.log('Dry run — re-run with --apply to actually delete.');
      return;
    }

    await prisma.$transaction([
      prisma.video.deleteMany({
        where: { id: { in: doomedVideos.map((video) => video.id) } },
      }),
      prisma.clip.deleteMany({ where: { id: { in: [...doomed.keys()] } } }),
    ]);

    // File cleanup is best-effort: orphans on disk beat a half-deleted DB.
    for (const relative of doomedPaths) {
      const absolute = path.resolve(storageRoot, relative);
      if (!absolute.startsWith(storageRoot + path.sep)) continue;
      await unlink(absolute).catch(() => undefined);
    }
    console.log('Cleanup applied.');
  } finally {
    await prisma.$disconnect();
  }
}

void main();
