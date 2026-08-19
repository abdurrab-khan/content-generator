import { useQuery } from '@tanstack/react-query';
import { getProject } from '../api/endpoints/projects';
import { isPipelineActive } from '../lib/status';
import { queryKeys } from './query-keys';

/**
 * Project detail (includes clips, videos, raw videos). Polls every 4s while
 * the pipeline is running or any clip is mid-cut, then settles.
 */
export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: () => getProject(id),
    refetchInterval: (query) => {
      const project = query.state.data;
      if (!project) return false;
      if (isPipelineActive(project.pipelineState)) return 4000;
      const clipsInFlight = project.clips.some(
        (clip) => clip.state === 'PENDING' || clip.state === 'CUTTING',
      );
      return clipsInFlight ? 4000 : false;
    },
  });
}
