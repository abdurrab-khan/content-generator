import { API_URL } from '../../config/env';
import { apiFetch } from '../http';
import type { ClipRender, ColorGradingPreset } from '../types';

/** Shared preset catalog (global, same for every user). */
export async function listColorGradingPresets(): Promise<ColorGradingPreset[]> {
  const { data } = await apiFetch<ColorGradingPreset[]>('/color-grading/presets');
  return data;
}

export interface SubmitClipRenderResult {
  render: ClipRender;
  /** false when the variant already existed and nothing was re-queued. */
  queued: boolean;
}

/** Request a graded variant of a clip (idempotent per clip + preset). */
export async function createClipRender(
  clipId: string,
  presetId: string,
): Promise<SubmitClipRenderResult> {
  const { data } = await apiFetch<SubmitClipRenderResult>(
    `/clips/${clipId}/renders`,
    { method: 'POST', body: { presetId } },
  );
  return data;
}

/** All rendered variants of a clip (for the clip card). */
export async function listClipRenders(clipId: string): Promise<ClipRender[]> {
  const { data } = await apiFetch<ClipRender[]>(`/clips/${clipId}/renders`);
  return data;
}

/** Delete a variant row + its file (the original clip is untouched). */
export async function deleteClipRender(renderId: string): Promise<void> {
  await apiFetch<void>(`/renders/${renderId}`, { method: 'DELETE' });
}

/** Authenticated mp4 stream URL (attach `Authorization: Bearer <token>`). */
export function renderStreamUrl(renderId: string): string {
  return `${API_URL}/renders/${renderId}/stream`;
}
