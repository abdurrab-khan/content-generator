import { useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Video } from "../../../src/api/types";
import type { MediaKind } from "../../../src/components/player/video-player-screen";
import { useProject } from "../../../src/queries/use-project";
import { useDeleteVideo } from "../../../src/queries/use-videos";
import { toast } from "../../../src/store/toast-store";
import { ProjectHero } from "../../../src/components/projects/project-hero";
import { PipelineProgress } from "../../../src/components/projects/pipeline-progress";
import {
  ProjectTabContent,
  type ProjectTabKey,
} from "../../../src/components/projects/project-tab-content";
import { AppText } from "../../../src/components/ui/app-text";
import { Button } from "../../../src/components/ui/button";
import { EmptyState } from "../../../src/components/ui/empty-state";
import { Screen } from "../../../src/components/ui/screen";
import {
  SegmentedTabs,
  type TabItem,
} from "../../../src/components/ui/segmented-tabs";
import { Skeleton } from "../../../src/components/ui/skeleton";
import { colors } from "../../../src/theme";

/**
 * Project detail (requirement #4) — pipeline progress + segmented tabs for
 * raw clips, ready videos and the source download.
 */
export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const projectId = id ?? "";
  const {
    data: project,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useProject(projectId);
  const [tab, setTab] = useState<ProjectTabKey | null>(null);
  const decidedForProjectRef = useRef<string | null>(null);

  // Pick the initial tab exactly once per project ("Ready" when videos
  // exist, else "Clips"). This runs during render — React's documented
  // "derive state during render" pattern — guarded by a ref whose value is
  // always current. The previous useEffect+flag version raced with the 4s
  // polling refetch: a stale effect closure could fire AFTER a user's tap
  // and snap the tab back to "ready". After the initial decision, only a
  // user tap can change the tab.
  if (project && decidedForProjectRef.current !== project.id) {
    decidedForProjectRef.current = project.id;
    setTab(
      project.videos.some((video) => video.status === "ACTIVE")
        ? "ready"
        : "clips",
    );
  }

  const activeTab: ProjectTabKey = tab ?? "clips";
  const changeTab = setTab;

  const play = (mediaId: string, kind: MediaKind, title: string) => {
    router.push({
      pathname: "/player/[id]",
      params: { id: mediaId, kind, title },
    });
  };

  const deleteVideo = useDeleteVideo();
  const handleDeleteVideo = (video: Video) => {
    deleteVideo.mutate(video.id, {
      onSuccess: () => toast.success("Video deleted"),
      onError: (mutationError) => toast.error(mutationError.message),
    });
  };

  if (isError) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load this project"
            message={error instanceof Error ? error.message : undefined}
          >
            <Button
              label="Try again"
              variant="secondary"
              onPress={() => void refetch()}
            />
          </EmptyState>
        </View>
      </Screen>
    );
  }

  if (isLoading || !project) {
    return (
      <Screen>
        <View style={{ gap: 16, paddingTop: 8 }}>
          <Skeleton height={200} borderRadius={22} />
          <Skeleton height={26} width="70%" />
          <Skeleton height={14} width="45%" />
          <Skeleton height={120} borderRadius={22} />
          <Skeleton height={120} borderRadius={22} />
        </View>
      </Screen>
    );
  }

  const readyCount = project.videos.filter(
    (video) => video.status === "ACTIVE",
  ).length;
  const tabs: TabItem<ProjectTabKey>[] = [
    { key: "clips", label: "Clips", count: project.clips.length },
    { key: "ready", label: "Ready", count: readyCount },
    { key: "source", label: "Source", count: project.rawVideos.length },
  ];

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.primaryBright}
          />
        }
      >
        <ProjectHero project={project} onBack={() => router.back()} />

        <View style={{ paddingHorizontal: 20, gap: 16 }}>
          <PipelineProgress
            state={project.pipelineState}
            errorMessage={project.errorMessage}
          />
          <SegmentedTabs tabs={tabs} active={activeTab} onChange={changeTab} />
          <ProjectTabContent
            project={project}
            tab={activeTab}
            onPlay={play}
            onDeleteVideo={handleDeleteVideo}
          />
          <AppText
            variant="caption"
            style={{ textAlign: "center", marginTop: 4 }}
          >
            Tap any title, description or tag to copy it.
          </AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}
