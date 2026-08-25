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
  /** Short "works great on..." hint shown on the preset card. */
  bestFor: string;
  filterGraph: string;
}

const BUILT_IN_PRESETS: PresetSeed[] = [
  {
    name: 'Cinematic Teal',
    description:
      'Lifted shadows, teal-orange color balance and a gentle vignette — the classic blockbuster grade.',
    bestFor: 'Story-driven clips, interviews, film look',
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
    bestFor: 'Nostalgic moments, film-style storytelling',
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
    bestFor: 'Fast-paced cuts, action, bold content',
    filterGraph:
      'eq=contrast=1.25:saturation=1.3:gamma=0.98,' + 'unsharp=5:5:0.8',
  },
  {
    name: 'Soft Matte',
    description:
      'Crushed blacks and rolled-off highlights for a flat, editorial matte finish.',
    bestFor: 'Editorial, muted, minimal aesthetics',
    filterGraph:
      "curves=all='0/0.06 0.5/0.5 1/0.94'," +
      'eq=contrast=0.95:saturation=0.9:brightness=0.02',
  },
  {
    name: 'B&W Film',
    description: 'High-contrast monochrome with a touch of film grain.',
    bestFor: 'Dramatic, artistic, timeless moments',
    // Static (uniform) grain: temporal noise ('allf=t') changes every frame
    // and balloons file sizes ~30x at CRF 18.
    filterGraph:
      'hue=s=0,' + 'eq=contrast=1.15:brightness=0.01,' + 'noise=alls=5:allf=u',
  },
  // -------------------------------------------------------------------
  // Social-feed looks (TikTok / Reels / Shorts). Encoding notes:
  //  - never use temporal noise (allf=t) — file size balloons ~30x
  //  - curves/colorbalance variants are normalized to yuv420p at render
  //    time (buildVideoFilterGraph), so they stay phone-decodable
  // -------------------------------------------------------------------
  {
    name: 'Viral Punch',
    description:
      'The TikTok look — punchy contrast, hot saturation and a crisp sharpen that pops on small screens.',
    bestFor: 'High-energy clips, reactions, bold colors',
    filterGraph:
      'eq=contrast=1.28:saturation=1.35:gamma=0.99,' + 'unsharp=5:5:1.4',
  },
  {
    name: 'Creamy Glow',
    description:
      'Soft, dreamy skin tones — a gentle halation bloom with warm milky mids, the cozy Reels aesthetic.',
    bestFor: 'Skin tones, beauty, cozy talking heads',
    filterGraph:
      'gblur=sigma=0.7,' +
      'eq=contrast=0.98:saturation=1.1:gamma=1.04:brightness=0.015,' +
      'colorbalance=rm=0.04:gm=0.01:bm=-0.03:rh=0.03:bh=-0.02',
  },
  {
    name: 'Moody Night',
    description:
      'Dark and dramatic — deep shadows, cool steel tones and a heavy vignette for late-night vibes.',
    bestFor: 'Night shots, dramatic moments, city lights',
    filterGraph:
      "curves=all='0/0 0.2/0.15 0.8/0.85 1/1'," +
      'eq=contrast=1.12:saturation=0.88:brightness=-0.01,' +
      'colorbalance=rm=-0.04:bm=0.05:rh=-0.03:bh=0.04,' +
      'vignette=0.35',
  },
  {
    name: 'Golden Hour',
    description:
      'Sun-kissed warmth — glowing amber highlights and rich oranges, like every frame was shot at 7pm.',
    bestFor: 'Outdoors, sunsets, warm lifestyle',
    filterGraph:
      'eq=contrast=1.08:saturation=1.15:gamma=1.02:brightness=0.015,' +
      'colorbalance=rs=0.06:rm=0.09:gm=0.03:bm=-0.07:rh=0.07:gh=0.02:bh=-0.06,' +
      'vignette=0.2',
  },
  {
    name: 'Neon Pop',
    description:
      'Electric city energy — icy-cool shadows, hyper-saturated colors and a hard sharpen for night shots.',
    bestFor: 'Night scenes, neon signs, tech',
    filterGraph:
      'eq=contrast=1.15:saturation=1.45:gamma=0.97,' +
      'colorbalance=rs=-0.04:bs=0.06:rm=-0.03:bm=0.05,' +
      'unsharp=5:5:1.1',
  },
  {
    name: 'Clean Studio',
    description:
      'Bright, minimal and true-to-life — lifted shadows and neutral whites for talking-head clips.',
    bestFor: 'Talking heads, tutorials, interviews',
    filterGraph:
      "curves=all='0/0.03 0.25/0.28 1/1'," +
      'eq=contrast=1.05:saturation=1.05:brightness=0.02',
  },
  {
    name: 'Vintage 90s',
    description:
      'VHS nostalgia — faded colors, warm haze and a soft static grain straight from a family camcorder.',
    bestFor: 'Nostalgia, family footage, retro vibes',
    filterGraph:
      "curves=all='0/0.04 0.5/0.48 1/0.96'," +
      'eq=contrast=0.92:saturation=0.82:gamma=1.08,' +
      'colorbalance=rm=0.05:bm=-0.04,' +
      'noise=alls=6:allf=u',
  },
  {
    name: 'Arctic Blue',
    description:
      'Crisp and ice-cold — steely blues with a clean sharpen, the tech-review / morning-routine look.',
    bestFor: 'Tech reviews, clean modern, morning routines',
    filterGraph:
      'eq=contrast=1.1:saturation=0.95:brightness=0.01,' +
      'colorbalance=rs=-0.05:bs=0.07:rm=-0.04:bm=0.06:rh=-0.03:bh=0.05,' +
      'unsharp=5:5:0.9',
  },
];

async function main(): Promise<void> {
  for (const preset of BUILT_IN_PRESETS) {
    const result = await prisma.colorGradingPreset.upsert({
      where: { name: preset.name },
      update: {
        description: preset.description,
        bestFor: preset.bestFor,
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
