import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelectedApplication } from '../../../src/queries/use-selected-application';
import { DiscoverPodcastsSection } from '../../../src/components/discovery/discover-podcasts-section';
import { EmptyState } from '../../../src/components/ui/empty-state';
import { Screen } from '../../../src/components/ui/screen';
import { Skeleton } from '../../../src/components/ui/skeleton';
import { radii } from '../../../src/theme';

/**
 * Discover tab — trending / popular podcast episodes found on YouTube for
 * the selected application's language. Reuses the exact same section UI the
 * home screen used: Popular/Trending toggle + the same podcast cards
 * (tap → YouTube, "Make clips" → project, ✕ → never show again).
 */
export default function DiscoverScreen() {
  const router = useRouter();
  const {
    applications,
    selected,
    isLoading: appsLoading,
  } = useSelectedApplication();

  if (appsLoading) {
    return (
      <Screen>
        <View style={{ gap: 16, paddingTop: 8 }}>
          <Skeleton height={30} width="45%" />
          <Skeleton height={40} borderRadius={radii.full} />
          <Skeleton height={236} borderRadius={22} />
        </View>
      </Screen>
    );
  }

  // Discovery is application-scoped (its language picks the podcaster
  // catalog) — without one there is nothing to search.
  if (applications.length === 0 || !selected) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="compass-outline"
            title="No application yet"
            message="Create an application on the Home tab first — its language decides which podcasters we search."
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <DiscoverPodcastsSection
          application={selected}
          onProjectCreated={(project) => router.push(`/project/${project.id}`)}
        />
      </ScrollView>
    </Screen>
  );
}
