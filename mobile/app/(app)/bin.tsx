import { FlatList, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelectedApplication } from '../../src/queries/use-selected-application';
import {
  useDeleteProjectPermanently,
  useProjects,
  useRestoreProject,
} from '../../src/queries/use-projects';
import { toast } from '../../src/store/toast-store';
import { AppText } from '../../src/components/ui/app-text';
import { EmptyState } from '../../src/components/ui/empty-state';
import { IconButton } from '../../src/components/ui/icon-button';
import { ProjectCard } from '../../src/components/projects/project-card';
import { Screen } from '../../src/components/ui/screen';
import { Skeleton } from '../../src/components/ui/skeleton';
import { colors } from '../../src/theme';

/**
 * Bin — soft-deleted projects of the selected application (requirement #3).
 * Cards can be opened (view/play) or permanently deleted, which erases the
 * DB row and every stored file (clips, videos, source, transcript).
 */
export default function BinScreen() {
  const router = useRouter();
  const { selected } = useSelectedApplication();
  const { data, isLoading, refetch, isRefetching } = useProjects(selected?.id ?? null, 'BIN');
  const deletePermanently = useDeleteProjectPermanently();
  const restoreProject = useRestoreProject();

  const deleteForever = (id: string) => {
    deletePermanently.mutate(id, {
      onSuccess: () => toast.success('Deleted permanently'),
      onError: (error) => toast.error(error.message),
    });
  };

  const restore = (id: string) => {
    restoreProject.mutate(id, {
      onSuccess: () => toast.success('Restored to home'),
      onError: (error) => toast.error(error.message),
    });
  };

  const projects = data?.items ?? [];

  return (
    <Screen padded={false}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <IconButton
          icon="chevron-back"
          onPress={() => router.back()}
          accessibilityLabel="Back to home"
        />
        <View style={{ flex: 1 }}>
          <AppText variant="heading">Bin</AppText>
          <AppText variant="caption">
            Restore a project with the undo icon, or erase it forever with the trash icon.
          </AppText>
        </View>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(project) => project.id}
        contentContainerStyle={{ padding: 20, gap: 16, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.primaryBright}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: 16 }}>
              <Skeleton height={190} borderRadius={22} />
              <Skeleton height={190} borderRadius={22} />
            </View>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <EmptyState
                icon="trash-outline"
                title="Bin is empty"
                message="Projects you delete from the home screen will show up here."
              />
            </View>
          )
        }
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => router.push(`/project/${item.id}`)}
            onRestore={() => restore(item.id)}
            onDeleteForever={() => deleteForever(item.id)}
          />
        )}
      />
    </Screen>
  );
}
