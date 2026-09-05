import {
  FlatList,
  Pressable,
  RefreshControl,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { Project } from "../../../src/api/types";
import { useProjects, useDeleteProject } from "../../../src/queries/use-projects";
import { useSelectedApplication } from "../../../src/queries/use-selected-application";
import { toast } from "../../../src/store/toast-store";
import { ApplicationSwitcher } from "../../../src/components/applications/application-switcher";
import { FirstRunExperience } from "../../../src/components/applications/first-run-experience";
import { HomeHeader } from "../../../src/components/projects/home-header";
import { NoProjectsHero } from "../../../src/components/projects/no-projects-hero";
import { ProjectCard } from "../../../src/components/projects/project-card";
import { YoutubeUrlInput } from "../../../src/components/projects/youtube-url-input";
import { AppText } from "../../../src/components/ui/app-text";
import { Screen } from "../../../src/components/ui/screen";
import { Skeleton } from "../../../src/components/ui/skeleton";
import { colors, radii } from "../../../src/theme";

/**
 * Home — dashboard for the selected application: YouTube link input, active
 * projects, bin shortcut, application switching. Podcast discovery lives on
 * its own Discover tab.
 */
export default function HomeScreen() {
  const router = useRouter();
  const {
    applications,
    selected,
    isLoading: appsLoading,
  } = useSelectedApplication();
  const activeProjects = useProjects(selected?.id ?? null, "ACTIVE");
  const binProjects = useProjects(selected?.id ?? null, "BIN");
  const deleteProject = useDeleteProject();

  // Boot state: applications still loading → calm skeleton instead of a
  // flash of unfiltered content.
  if (appsLoading) {
    return (
      <Screen>
        <View style={{ gap: 16, paddingTop: 8 }}>
          <Skeleton height={42} width="55%" />
          <Skeleton height={52} borderRadius={16} />
          <Skeleton height={210} borderRadius={22} />
          <Skeleton height={210} borderRadius={22} />
        </View>
      </Screen>
    );
  }

  // First-run: no applications yet → dedicated creation experience.
  if (applications.length === 0) {
    return <FirstRunExperience />;
  }

  const projects = activeProjects.data?.items ?? [];
  const binCount = binProjects.data?.items.length ?? 0;

  const openProject = (project: Project) =>
    router.push(`/project/${project.id}`);

  const moveToBin = (id: string) => {
    deleteProject.mutate(id, {
      onSuccess: () => toast.success("Moved to bin"),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <Screen padded={false}>
      <FlatList
        data={projects}
        keyExtractor={(project) => project.id}
        contentContainerStyle={{ padding: 20, gap: 16, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={activeProjects.isRefetching}
            onRefresh={() => void activeProjects.refetch()}
            tintColor={colors.primaryBright}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <HomeHeader />
            {selected ? (
              <ApplicationSwitcher
                applications={applications}
                selected={selected}
              />
            ) : null}
            {projects.length > 0 && (
              <YoutubeUrlInput
                applicationId={selected?.id ?? null}
                onCreated={openProject}
              />
            )}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <AppText variant="subheading">Projects</AppText>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityRole="button"
                onPress={() => router.push("/bin")}
                hitSlop={8}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: radii.full,
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Ionicons
                  name="trash-outline"
                  size={13}
                  color={colors.textMuted}
                />
                <AppText variant="caption" style={{ color: colors.textMuted }}>
                  Bin{binCount > 0 ? ` · ${binCount}` : ""}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          activeProjects.isLoading ? (
            <View style={{ gap: 16 }}>
              <Skeleton height={210} borderRadius={22} />
              <Skeleton height={210} borderRadius={22} />
            </View>
          ) : (
            <View style={{ flex: 1, justifyContent: "center" }}>
              <NoProjectsHero
                applicationId={selected?.id ?? null}
                onCreated={openProject}
              />
            </View>
          )
        }
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => openProject(item)}
            onMoveToBin={() => moveToBin(item.id)}
          />
        )}
      />
    </Screen>
  );
}
