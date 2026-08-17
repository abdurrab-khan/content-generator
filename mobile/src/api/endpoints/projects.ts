import { apiFetch } from "../http";
import type {
  ListResult,
  PaginationMeta,
  Project,
  ProjectDetail,
  RecordStatus,
} from "../types";

export async function listProjects(input: {
  status?: RecordStatus;
  page?: number;
  pageSize?: number;
}): Promise<ListResult<Project>> {
  const { data, meta } = await apiFetch<Project[]>("/projects", {
    query: {
      status: input.status ?? "ACTIVE",
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 100,
    },
  });
  return { items: data, meta: (meta as unknown as PaginationMeta) ?? null };
}

export async function createProject(input: {
  url: string;
  applicationId?: string;
}): Promise<Project> {
  const { data } = await apiFetch<Project>("/projects", {
    method: "POST",
    body: input,
  });
  return data;
}

export async function getProject(id: string): Promise<ProjectDetail> {
  const { data } = await apiFetch<ProjectDetail>(`/projects/${id}`);
  return data;
}

/** Soft delete — moves the project to the bin (recoverable). */
export async function deleteProject(id: string): Promise<void> {
  await apiFetch<void>(`/projects/${id}`, { method: "DELETE" });
}

/**
 * Permanent delete — only allowed for projects already in the bin.
 * Removes the DB row (cascading to clips/raw videos/videos) and deletes
 * the files from storage. Cannot be undone.
 */
export async function deleteProjectPermanently(id: string): Promise<void> {
  await apiFetch<void>(`/projects/${id}/permanent`, { method: "DELETE" });
}

/** Restore a binned project back to ACTIVE (bin-only). */
export async function restoreProject(id: string): Promise<Project> {
  const { data } = await apiFetch<Project>(`/projects/${id}/restore`, {
    method: "POST",
  });
  return data;
}
