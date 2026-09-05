import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiError } from '../../api/http';
import type {
  Application,
  DiscoveryMode,
  Project,
} from '../../api/types';
import {
  useDiscoveredPodcasts,
  useNotInterestedPodcast,
  useUsePodcast,
} from '../../queries/use-discovery';
import { toast } from '../../store/toast-store';
import { colors, radii } from '../../theme';
import { AppText } from '../ui/app-text';
import { SegmentedTabs } from '../ui/segmented-tabs';
import { Skeleton } from '../ui/skeleton';
import { PodcastCard } from './podcast-card';

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
  { key: 'popular', label: 'Popular' },
  { key: 'trending', label: 'Trending' },
];

export function DiscoverPodcastsSection({
  application,
  onProjectCreated,
}: DiscoverPodcastsSectionProps) {
  const [mode, setMode] = useState<DiscoveryMode>('popular');
  const [busyVideoId, setBusyVideoId] = useState<string | null>(null);

  const podcasts = useDiscoveredPodcasts(application.id, mode);
  const notInterested = useNotInterestedPodcast();
  const usePodcast = useUsePodcast();

  const items = podcasts.data?.items ?? [];

  const makeClips = async (podcast: (typeof items)[number]) => {
    setBusyVideoId(podcast.sourceVideoId);
    try {
      const project = await usePodcast.mutateAsync({
        applicationId: application.id,
        podcast,
      });
      toast.success('Project created — pipeline started');
      onProjectCreated(project);
    } catch (cause) {
      toast.error(
        cause instanceof ApiError
          ? cause.message
          : 'Could not create the project.',
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
      toast.success('Got it — this one won’t come back');
    } catch (cause) {
      toast.error(
        cause instanceof ApiError ? cause.message : 'Could not dismiss it.',
      );
    } finally {
      setBusyVideoId(null);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AppText variant="subheading">Discover podcasts</AppText>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
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
            {application.language === 'HINDI' ? 'Hindi' : 'English'}
          </AppText>
        </View>
        <View style={{ flex: 1 }} />
        {podcasts.isRefetching && !podcasts.isLoading ? (
          <Ionicons name="sync" size={13} color={colors.textDim} />
        ) : null}
      </View>

      <SegmentedTabs tabs={MODE_TABS} active={mode} onChange={setMode} />

      {podcasts.isLoading ? (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Skeleton height={236} width={264} borderRadius={radii.xl} />
          <Skeleton height={236} width={264} borderRadius={radii.xl} />
        </View>
      ) : podcasts.isError ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
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
              : 'Could not load suggestions — searching YouTube takes a moment.'}
          </AppText>
          <Pressable onPress={() => void podcasts.refetch()} hitSlop={8}>
            <AppText variant="label" style={{ color: colors.primaryBright }}>
              Retry
            </AppText>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <AppText variant="muted" style={{ fontSize: 13 }}>
          No fresh episodes right now — everything found so far is already in
          your projects or dismissed. Try the other tab.
        </AppText>
      ) : (
        <FlatList
          horizontal
          data={items}
          keyExtractor={(item) => item.sourceVideoId}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <PodcastCard
              podcast={item}
              busy={busyVideoId === item.sourceVideoId}
              onMakeClips={() => void makeClips(item)}
              onNotInterested={() => void dismiss(item)}
            />
          )}
        />
      )}
    </View>
  );
}
