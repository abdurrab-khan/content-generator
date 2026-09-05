/** Central query-key registry — keeps cache invalidation consistent. */

export const queryKeys = {
  applications: ['applications'] as const,
  projectsPrefix: ['projects'] as const,
  projects: (applicationId: string | null, status: string) =>
    ['projects', 'list', applicationId ?? 'all', status] as const,
  project: (id: string) => ['projects', 'detail', id] as const,
  clips: (projectId: string) => ['clips', projectId] as const,
  rawVideos: (projectId: string) => ['raw-videos', projectId] as const,
  colorGradingPresets: ['color-grading-presets'] as const,
  clipRenders: (clipId: string) => ['clip-renders', clipId] as const,
  discoveryPrefix: ['discovery'] as const,
  discoveryPodcasters: (applicationId: string) =>
    ['discovery', 'podcasters', applicationId] as const,
  discoveryPodcasts: (applicationId: string, mode: string) =>
    ['discovery', 'podcasts', applicationId, mode] as const,
};
