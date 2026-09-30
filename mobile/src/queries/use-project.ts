import { useQuery } from "@tanstack/react-query";
import { getProject } from "../api/endpoints/projects";
import { isPipelineActive, isRenderInFlight } from "../lib/status";
import { queryKeys } from "./query-keys";

/**
 * Project detail (includes clips with renders, videos, raw videos). Polls
 * every 4s while the pipeline is running, any clip is mid-cut, or any render
 * is mid-grading, then settles.
 */
export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: () => getProject(id),
    refetchInterval: (query) => {
      const project = query.state.data;
      if (!project) return false;
      if (isPipelineActive(project.pipelineState)) return 10000;
      const clipsInFlight = project.clips.some(
        (clip) =>
          clip.state === "PENDING" ||
          clip.state === "CUTTING" ||
          clip.renders.some((render) => isRenderInFlight(render.state)),
      );
      return clipsInFlight ? 10000 : false;
    },
  });
}
