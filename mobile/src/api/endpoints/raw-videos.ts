import { API_URL } from '../../config/env';
import { apiFetch } from '../http';
import type { RawVideo } from '../types';

export async function listRawVideos(projectId: string): Promise<RawVideo[]> {
  const { data } = await apiFetch<RawVideo[]>('/raw-videos', {
    query: { projectId },
  });
  return data;
}

/** Authenticated mp4 stream URL (attach `Authorization: Bearer <token>`). */
export function rawVideoStreamUrl(id: string): string {
  return `${API_URL}/raw-videos/${id}/stream`;
}
