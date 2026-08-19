/** Central query-key registry — keeps cache invalidation consistent. */

export const queryKeys = {
  applications: ['applications'] as const,
  projectsPrefix: ['projects'] as const,
  projects: (applicationId: string | null, status: string) =>
    ['projects', 'list', applicationId ?? 'all', status] as const,
  project: (id: string) => ['projects', 'detail', id] as const,
  clips: (projectId: string) => ['clips', projectId] as const,
  rawVideos: (projectId: string) => ['raw-videos', projectId] as const,
};
