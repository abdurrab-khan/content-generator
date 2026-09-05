import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listDiscoveredPodcasts,
  listDiscoveryPodcasters,
  markPodcastNotInterested,
  useDiscoveredPodcast,
} from '../api/endpoints/discovery';
import type { DiscoveryMode } from '../api/types';
import { queryKeys } from './query-keys';

/**
 * Discovery suggestions are computed live by the server (yt-dlp searches +
 * hydration), so a fetch can take a while — keep results fresh for 10 min
 * and never refetch in the background.
 */
const DISCOVERY_STALE_TIME = 10 * 60 * 1000;

/** Podcaster catalog of the application language. */
export function useDiscoveryPodcasters(applicationId: string | null) {
  return useQuery({
    queryKey: queryKeys.discoveryPodcasters(applicationId ?? 'none'),
    queryFn: () => listDiscoveryPodcasters(applicationId!),
    enabled: applicationId !== null,
    staleTime: Infinity,
  });
}

/** Trending / popular podcast episodes, already filtered server-side. */
export function useDiscoveredPodcasts(
  applicationId: string | null,
  mode: DiscoveryMode,
) {
  return useQuery({
    queryKey: queryKeys.discoveryPodcasts(applicationId ?? 'none', mode),
    queryFn: () =>
      listDiscoveredPodcasts({ applicationId: applicationId!, mode }),
    enabled: applicationId !== null,
    staleTime: DISCOVERY_STALE_TIME,
    refetchOnWindowFocus: false,
  });
}

/** Dismiss a suggestion — server caches it as NOT_INTERESTED forever. */
export function useNotInterestedPodcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markPodcastNotInterested,
    onSuccess: (_result, input) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.discoveryPrefix,
      });
      void input;
    },
  });
}

/** "Make clips" — creates a project from the podcast, pipeline starts. */
export function useUsePodcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: useDiscoveredPodcast,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.discoveryPrefix,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projectsPrefix,
      });
    },
  });
}
