import type { ClipRender, ColorGradingPreset } from '../../generated/prisma/client.js';

/**
 * The composition seam for render effects: builds the single FFmpeg video
 * filter chain (-vf) from everything a render requested. Today that is the
 * color grading preset's chain; future effects (overlays, captions, ...)
 * append their segments here. Audio effects don't join this string — they
 * contribute extra inputs / -filter_complex graphs instead.
 */
export function buildVideoFilterGraph(
  render: ClipRender & { colorGradingPreset?: ColorGradingPreset | null },
): string {
  const segments: string[] = [];
  if (render.colorGradingPreset) {
    segments.push(render.colorGradingPreset.filterGraph);
  }
  if (segments.length === 0) return '';
  // Delivery normalization: some filters (curves, colorbalance) negotiate
  // full-chroma formats that libx264 encodes as yuv444p — undecodable by
  // Android/iOS hardware players. Always end the chain in 8-bit 4:2:0.
  segments.push('format=yuv420p');
  return segments.join(',');
}
