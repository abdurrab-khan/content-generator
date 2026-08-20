/**
 * Seed: built-in color grading presets (idempotent — upserts by name).
 *
 * Each preset's `filterGraph` is a raw FFmpeg video filter chain applied
 * when rendering a clip variant (see FfmpegService.applyFilterGraph).
 *
 *   pnpm db:seed-presets
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});

interface PresetSeed {
  name: string;
  description: string;
  filterGraph: string;
}

const BUILT_IN_PRESETS: PresetSeed[] = [
  {
    name: 'Cinematic Teal',
    description:
      'Lifted shadows, teal-orange color balance and a gentle vignette — the classic blockbuster grade.',
    filterGraph:
      "curves=all='0/0 0.25/0.20 1/1'," +
      'eq=contrast=1.18:saturation=1.18:gamma=1.03:brightness=0.01,' +
      'colorbalance=rs=0.05:gs=0.01:bs=-0.05:rm=0.10:gm=0.04:bm=-0.08:rh=0.06:gh=0.01:bh=-0.05,' +
      'unsharp=5:5:1.2,' +
      'vignette=0.3',
  },
  {
    name: 'Warm Vintage',
    description:
      'Warm mids, faded contrast and soft vignetting for a nostalgic film look.',
    filterGraph:
      "curves=all='0/0 0.2/0.25 1/1'," +
      'eq=contrast=1.05:saturation=0.9:gamma=1.05:brightness=0.02,' +
      'colorbalance=rs=0.08:rm=0.06:rh=0.04:bs=-0.06:bm=-0.05:bh=-0.04,' +
      'vignette=0.25',
  },
  {
    name: 'Punchy Contrast',
    description:
      'Hard contrast and boosted saturation with a light sharpen — built for fast-paced shorts.',
    filterGraph:
      'eq=contrast=1.25:saturation=1.3:gamma=0.98,' +
      'unsharp=5:5:0.8',
  },
  {
    name: 'Soft Matte',
    description:
      'Crushed blacks and rolled-off highlights for a flat, editorial matte finish.',
    filterGraph:
      "curves=all='0/0.06 0.5/0.5 1/0.94'," +
      'eq=contrast=0.95:saturation=0.9:brightness=0.02',
  },
  {
    name: 'B&W Film',
    description:
      'High-contrast monochrome with a touch of film grain.',
    // Static (uniform) grain: temporal noise ('allf=t') changes every frame
    // and balloons file sizes ~30x at CRF 18.
    filterGraph:
      'hue=s=0,' +
      'eq=contrast=1.15:brightness=0.01,' +
      'noise=alls=5:allf=u',
  },
];

async function main(): Promise<void> {
  for (const preset of BUILT_IN_PRESETS) {
    const result = await prisma.colorGradingPreset.upsert({
      where: { name: preset.name },
      update: {
        description: preset.description,
        filterGraph: preset.filterGraph,
      },
      create: { ...preset, isBuiltIn: true },
    });
    console.log(`Preset "${result.name}" ready (${result.id})`);
  }
  console.log(`\nSeeded ${BUILT_IN_PRESETS.length} color grading preset(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
