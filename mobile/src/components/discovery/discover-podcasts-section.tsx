import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ApiError, apiFetch } from "../../api/http";
import type { Application, DiscoveryMode, Project } from "../../api/types";
import {
  useDiscoveredPodcasts,
  useNotInterestedPodcast,
  useUsePodcast,
} from "../../queries/use-discovery";
import { toast } from "../../store/toast-store";
import { colors, radii } from "../../theme";
import { AppText } from "../ui/app-text";
import { SegmentedTabs } from "../ui/segmented-tabs";
import { Skeleton } from "../ui/skeleton";
import { PodcastCard } from "./podcast-card";
import { IconButton } from "../ui/icon-button";

/**
 * Home-page discovery rail — trending / all-time popular podcast episodes
 * for the selected application's language. Videos already used or dismissed
 * never reappear (server-side cache).
 */
export interface DiscoverPodcastsSectionProps {
  application: Application;
  onProjectCreated: (project: Project) => void;
}

const MODE_TABS: { key: DiscoveryMode; label: string }[] = [
  { key: "popular", label: "Popular" },
  { key: "trending", label: "Trending" },
];

// Just refetch the current podcast, does not find new podcasts
const RefetchPodcastsBtn = ({ refetch }: { refetch: () => void }) => {
  return (
    <View style={{ alignItems: "flex-end" }}>
      <IconButton icon="repeat" onPress={refetch} />
    </View>
  );
};

export function DiscoverPodcastsSection({
  application,
  onProjectCreated,
}: DiscoverPodcastsSectionProps) {
  const [mode, setMode] = useState<DiscoveryMode>("popular");
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const [busyVideoId, setBusyVideoId] = useState<string | null>(null);

  const usePodcast = useUsePodcast();
  const notInterested = useNotInterestedPodcast();
  const podcasts = useDiscoveredPodcasts(application.id, mode);

  const items = podcasts.data?.items ?? [];

  // refetch for new podcasts, mean delete current one and find one podcasts
  const refetchPodcasts = async () => {
    setIsRefetching(true);
    try {
      await apiFetch("/discovery/podcasts/refetch", {
        method: "POST",
        query: {
          applicationId: application.id,
          mode: mode,
          limit: 20,
        },
      });
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Failed to refetch new podcasts",
      );
    } finally {
      setIsRefetching(false);
    }
  };

  const alertToRefetch = () => {
    if (items.length > 0) {
      Alert.alert(
        "Do you really want to refetch",
        `Refetch will remove the current ${mode} podcasts and find new ones.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Refetch", style: "destructive", onPress: refetchPodcasts },
        ],
        {
          userInterfaceStyle: "dark",
        },
      );
    } else {
      refetchPodcasts();
    }
  };

  const makeClips = async (podcast: (typeof items)[number]) => {
    setBusyVideoId(podcast.sourceVideoId);
    try {
      const project = await usePodcast.mutateAsync({
        applicationId: application.id,
        podcast,
      });
      toast.success("Project created — pipeline started");
      onProjectCreated(project);
    } catch (cause) {
      toast.error(
        cause instanceof ApiError
          ? cause.message
          : "Could not create the project.",
      );
    } finally {
      setBusyVideoId(null);
    }
  };

  const dismiss = async (podcast: (typeof items)[number]) => {
    setBusyVideoId(podcast.sourceVideoId);
    try {
      await notInterested.mutateAsync({
        applicationId: application.id,
        podcast,
      });
      toast.success("Got it — this one won’t come back");
    } catch (cause) {
      toast.error(
        cause instanceof ApiError ? cause.message : "Could not dismiss it.",
      );
    } finally {
      setBusyVideoId(null);
    }
  };

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.sourceVideoId}
      contentContainerStyle={{
        paddingInline: 20,
        paddingBottom: 20,
      }}
      renderItem={({ item }) => (
        <PodcastCard
          podcast={item}
          busy={busyVideoId === item.sourceVideoId}
          onMakeClips={() => void makeClips(item)}
          onNotInterested={() => void dismiss(item)}
        />
      )}
      refreshControl={
        <RefreshControl
          onRefresh={alertToRefetch}
          refreshing={isRefetching || podcasts.isRefetching}
        />
      }
      ListHeaderComponent={
        <View style={{ gap: 12, paddingTop: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AppText variant="subheading">Discover podcasts</AppText>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radii.full,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Ionicons
                name="language-outline"
                size={11}
                color={colors.primaryBright}
              />
              <AppText variant="caption" style={{ color: colors.textMuted }}>
                {application.language === "HINDI" ? "Hindi" : "English"}
              </AppText>
            </View>
          </View>
          <SegmentedTabs tabs={MODE_TABS} active={mode} onChange={setMode} />
          <RefetchPodcastsBtn refetch={podcasts.refetch} />
        </View>
      }
      ListEmptyComponent={
        <>
          {podcasts.isLoading && (
            <View style={{ gap: 12 }}>
              <Skeleton height={236} borderRadius={radii.xl} />
              <Skeleton height={236} borderRadius={radii.xl} />
            </View>
          )}
          {podcasts.isError && (
            <React.Fragment>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radii.lg,
                  padding: 14,
                }}
              >
                <Ionicons
                  name="cloud-offline-outline"
                  size={18}
                  color={colors.textDim}
                />
                <AppText variant="muted" style={{ flex: 1, fontSize: 13 }}>
                  {podcasts.error instanceof ApiError
                    ? podcasts.error.message
                    : "Could not load suggestions — searching YouTube takes a moment."}
                </AppText>
                <Pressable onPress={() => void podcasts.refetch()} hitSlop={8}>
                  <AppText
                    variant="label"
                    style={{ color: colors.primaryBright }}
                  >
                    Retry
                  </AppText>
                </Pressable>
              </View>
            </React.Fragment>
          )}
          {!podcasts.isLoading && items.length === 0 && (
            <AppText
              variant="muted"
              style={{
                fontSize: 13,
                color: "white",
              }}
            >
              No fresh episodes right now — everything found so far is already
              in your projects or dismissed. Try the other tab.
            </AppText>
          )}
        </>
      }
    />
  );
}
