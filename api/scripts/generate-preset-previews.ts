/**
 * Generate the short graded preview loop for each color grading preset.
 *
 * One curated neutral source clip is graded once per preset with the SAME
 * normalization the real render path uses (filterGraph + format=yuv420p),
 * downscaled to a tiny muted 2s loop (~150KB) that preset cards autoplay.
 *
 *   pnpm db:generate-previews           # only presets missing a preview
 *   pnpm db:generate-previews -- --all  # regenerate every active preset
 */
import 'dotenv/config';
import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { execa } from 'execa';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  RecordStatus,
  type ColorGradingPreset,
} from '../src/generated/prisma/client.js';

const ALL = process.argv.includes('--all');

const STORAGE_ROOT = path.resolve(process.env.STORAGE_ROOT ?? './storage');
const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg';
const PREVIEW_DIR = path.join(STORAGE_ROOT, 'preset_previews');
const SOURCE_DEST = path.join(PREVIEW_DIR, '_source.mp4');

/**
 * A neutral source moment: mid-tones, a face, mixed colors — previews are
 * only useful when the "before" clip doesn't already lean toward a look.
 * Override with PREVIEW_SOURCE=<absolute path> to use a different clip.
 */
const DEFAULT_SOURCE_CLIP = path.join(
  STORAGE_ROOT,
  'clips',
  'color-grading-preview-clip.mp4',
);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});

async function renderPreview(
  preset: ColorGradingPreset,
  source: string,
): Promise<string> {
  const outputAbsolute = path.join(PREVIEW_DIR, `${preset.id}.mp4`);

  // -2 keeps dimensions divisible by 2 (h264 requirement) on any source size.
  const graph = `scale=480:-2,${preset.filterGraph},format=yuv420p`;
  await execa(FFMPEG, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-t',
    '2',
    '-i',
    source,
    '-vf',
    graph,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '28',
    '-an',
    '-movflags',
    '+faststart',
    '-y',
    outputAbsolute,
  ]);
  return outputAbsolute;
}

async function main(): Promise<void> {
  const sourceEnv = process.env.PREVIEW_SOURCE;
  const source = sourceEnv ? path.resolve(sourceEnv) : DEFAULT_SOURCE_CLIP;

  await execa(FFMPEG, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    source,
    '-f',
    'null',
    '-t',
    '0.1',
    '-',
  ]).catch(() => {
    throw new Error(`Preview source not readable: ${source}`);
  });
  // Keep a stable copy so future regenerations don't depend on user clips.
  await copyFile(source, SOURCE_DEST);

  const presets = await prisma.colorGradingPreset.findMany({
    where: {
      status: RecordStatus.ACTIVE,
      ...(ALL ? {} : { previewPath: null }),
    },
    orderBy: { name: 'asc' },
  });

  if (presets.length === 0) {
    console.log(
      'All presets already have previews (use -- --all to regenerate).',
    );
    return;
  }

  console.log(
    `Generating ${presets.length} preview(s) from ${path.basename(SOURCE_DEST)}...`,
  );
  for (const preset of presets) {
    const outputAbsolute = await renderPreview(preset, SOURCE_DEST);
    const relative = path.relative(STORAGE_ROOT, outputAbsolute);
    await prisma.colorGradingPreset.update({
      where: { id: preset.id },
      data: { previewPath: relative },
    });
    console.log(`  ${preset.name} -> ${relative}`);
  }
  console.log('Done.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
