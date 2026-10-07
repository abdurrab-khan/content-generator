import { API_URL } from "../../config/env";
import { apiFetch } from "../http";
import type { Video } from "../types";

export async function listVideos(): Promise<Video[]> {
  const { data } = await apiFetch<Video[]>("/videos");
  return data;
}

export async function getVideo(id: string): Promise<Video> {
  const { data } = await apiFetch<Video>(`/videos/${id}`);
  return data;
}

/** Authenticated mp4 stream URL (attach `Authorization: Bearer <token>`). */
export function videoStreamUrl(id: string): string {
  return `${API_URL}/videos/${id}/stream`;
}

/**
 * Permanently delete a video — removes the row and its file. When the clip
 * it was cut from shares the same file, the clip is deleted too (API-side).
 */
export async function deleteVideo(id: string): Promise<void> {
  await apiFetch<void>(`/videos/${id}`, { method: "DELETE" });
}
