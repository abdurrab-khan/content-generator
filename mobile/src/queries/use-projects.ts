import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProject,
  deleteProject,
  deleteProjectPermanently,
  listProjects,
  restoreProject,
} from '../api/endpoints/projects';
import type { RecordStatus } from '../api/types';
import { isPipelineActive } from '../lib/status';
import { queryKeys } from './query-keys';

/**
 * Projects of one application. The API lists projects for the whole user;
 * filtering per application happens client-side via `applicationId`.
 * Polls while any listed project is still moving through the pipeline.
 */
export function useProjects(applicationId: string | null, status: RecordStatus) {
  return useQuery({
    queryKey: queryKeys.projects(applicationId, status),
    queryFn: async () => {
      const result = await listProjects({ status, pageSize: 100 });
      const items = applicationId
        ? result.items.filter((project) => project.applicationId === applicationId)
        : result.items;
      return { ...result, items };
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.items.some((project) => isPipelineActive(project.pipelineState))
        ? 6000
        : false;
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectsPrefix });
      queryClient.setQueryData(['projects', 'detail', created.id], {
        ...created,
        clips: [],
        videos: [],
        rawVideos: [],
      });
    },
  });
}

/** Soft delete — moves the project to the bin. */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: (_result, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectsPrefix });
      queryClient.removeQueries({ queryKey: queryKeys.project(id) });
    },
  });
}

/** Permanent delete — hard-deletes a binned project row and its files. */
export function useDeleteProjectPermanently() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProjectPermanently,
    onSuccess: (_result, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectsPrefix });
      queryClient.removeQueries({ queryKey: queryKeys.project(id) });
    },
  });
}

/** Restore — moves a binned project back to ACTIVE. */
export function useRestoreProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restoreProject,
    onSuccess: (_result, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectsPrefix });
      queryClient.removeQueries({ queryKey: queryKeys.project(id) });
    },
  });
}
