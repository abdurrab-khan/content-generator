import { API_URL } from '../../config/env';
import { apiFetch } from '../http';
import type { Clip } from '../types';

export async function listClips(projectId: string): Promise<Clip[]> {
  const { data } = await apiFetch<Clip[]>(`/projects/${projectId}/clips`);
  return data;
}

export async function updateClip(
  id: string,
  input: { title?: string; start?: number; end?: number },
): Promise<Clip> {
  const { data } = await apiFetch<Clip>(`/clips/${id}`, {
    method: 'PATCH',
    body: input,
  });
  return data;
}

export async function deleteClip(id: string): Promise<void> {
  await apiFetch<void>(`/clips/${id}`, { method: 'DELETE' });
}

/** Authenticated mp4 stream URL (attach `Authorization: Bearer <token>`). */
export function clipStreamUrl(id: string): string {
  return `${API_URL}/clips/${id}/stream`;
}

/** Authenticated .srt captions URL (attach `Authorization: Bearer <token>`). */
export function clipCaptionsUrl(id: string): string {
  return `${API_URL}/clips/${id}/captions`;
}
