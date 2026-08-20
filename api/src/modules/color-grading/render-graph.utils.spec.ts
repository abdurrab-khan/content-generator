import { describe, expect, it } from 'vitest';
import type {
  ClipRender,
  ColorGradingPreset,
} from '../../generated/prisma/client.js';
import { buildVideoFilterGraph } from './render-graph.utils.js';

function renderWith(
  preset: Pick<ColorGradingPreset, 'filterGraph'> | null,
): ClipRender & { colorGradingPreset: ColorGradingPreset | null } {
  return {
    colorGradingPreset: preset as ColorGradingPreset | null,
  } as ClipRender & { colorGradingPreset: ColorGradingPreset | null };
}

describe('buildVideoFilterGraph', () => {
  it('appends delivery normalization (yuv420p) after the preset chain', () => {
    const graph = buildVideoFilterGraph(
      renderWith({ filterGraph: 'eq=contrast=1.25:saturation=1.3' }),
    );
    expect(graph).toBe('eq=contrast=1.25:saturation=1.3,format=yuv420p');
  });

  it('normalizes curves presets too (curves outputs full-chroma formats)', () => {
    const graph = buildVideoFilterGraph(
      renderWith({ filterGraph: "curves=all='0/0 0.25/0.20 1/1'" }),
    );
    expect(graph).toBe("curves=all='0/0 0.25/0.20 1/1',format=yuv420p");
  });

  it('returns an empty graph when no effects are requested', () => {
    expect(buildVideoFilterGraph(renderWith(null))).toBe('');
  });
});
