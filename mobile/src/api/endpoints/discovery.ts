import { apiFetch } from "../http";
import type {
  DiscoveredPodcast,
  DiscoveredPodcastsResult,
  DiscoveryMode,
  PodcasterCatalog,
  Project,
} from "../types";

/** Podcaster catalog for the application language. */
export async function listDiscoveryPodcasters(
  applicationId: string,
): Promise<PodcasterCatalog> {
  const { data } = await apiFetch<PodcasterCatalog>("/discovery/podcasters", {
    query: { applicationId },
  });
  return data;
}

/**
 * Trending / popular podcast episodes for the application. Videos already
 * used for a project or marked "not interested" are excluded server-side.
 */
export async function listDiscoveredPodcasts(input: {
  applicationId: string;
  mode: DiscoveryMode;
  limit?: number;
}): Promise<DiscoveredPodcastsResult> {
  const { data } = await apiFetch<DiscoveredPodcastsResult>(
    "/discovery/podcasts",
    {
      query: {
        applicationId: input.applicationId,
        mode: input.mode,
        limit: input.limit ?? 20,
      },
    },
  );
  return data;
}

/** "Not interested" — the video is never suggested again. */
export async function markPodcastNotInterested(input: {
  applicationId: string;
  podcast: DiscoveredPodcast;
}): Promise<void> {
  const { podcast } = input;
  await apiFetch("/discovery/podcasts/not-interested", {
    method: "POST",
    body: {
      applicationId: input.applicationId,
      sourceVideoId: podcast.sourceVideoId,
      url: podcast.url,
      title: podcast.title,
      channelName: podcast.channelName,
      thumbnail: podcast.thumbnail,
      durationSeconds: podcast.durationSeconds,
      viewCount: podcast.viewCount,
      likeCount: podcast.likeCount,
      publishedAt: podcast.publishedAt,
    },
  });
}

/** "Make clips" — creates a project from the podcast (pipeline starts). */
export async function useDiscoveredPodcast(input: {
  applicationId: string;
  podcast: DiscoveredPodcast;
}): Promise<Project> {
  const { podcast } = input;
  const { data } = await apiFetch<Project>("/discovery/podcasts/use", {
    method: "POST",
    body: {
      applicationId: input.applicationId,
      url: podcast.url,
      title: podcast.title,
      channelName: podcast.channelName,
      thumbnail: podcast.thumbnail,
      durationSeconds: podcast.durationSeconds,
      viewCount: podcast.viewCount,
      likeCount: podcast.likeCount,
      publishedAt: podcast.publishedAt,
    },
  });
  return data;
}
