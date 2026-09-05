import {
  ActivityIndicator,
  Linking,
  Pressable,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { DiscoveredPodcast } from '../../api/types';
import {
  formatCount,
  formatDuration,
  formatRelativeDate,
} from '../../lib/format';
import { toast } from '../../store/toast-store';
import { colors, fonts, gradients, radii } from '../../theme';
import { AppText } from '../ui/app-text';
import { Card } from '../ui/card';

/**
 * One discovered podcast suggestion in the horizontal carousel — thumbnail
 * with podcaster chip + duration, stats row (views · likes · date), and the
 * two cache actions: "Make clips" (USED) and dismiss (NOT_INTERESTED).
 * Tapping the thumbnail or title opens the video on YouTube.
 */

/** Open the video on YouTube (deep-links into the app on Android). */
async function openOnYouTube(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    toast.error('Could not open YouTube.');
  }
}

export interface PodcastCardProps {
  podcast: DiscoveredPodcast;
  /** True while either action of THIS card is in flight. */
  busy?: boolean;
  onMakeClips: () => void;
  onNotInterested: () => void;
}

export function PodcastCard({
  podcast,
  busy = false,
  onMakeClips,
  onNotInterested,
}: PodcastCardProps) {
  return (
    <Card padded={false} style={{ width: 264 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Watch on YouTube"
        onPress={() => void openOnYouTube(podcast.url)}
      >
        <View style={{ aspectRatio: 16 / 9, backgroundColor: colors.cardAlt }}>
        {podcast.thumbnail ? (
          <Image
            source={{ uri: podcast.thumbnail }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="mic-outline" size={30} color={colors.textDim} />
          </View>
        )}
        <LinearGradient
          colors={[...gradients.thumbnailScrim]}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: 'rgba(0,0,0,0.55)',
            borderRadius: radii.full,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <Ionicons name="mic" size={10} color={colors.primaryBright} />
          <AppText variant="caption" style={{ color: '#fff', fontSize: 10 }}>
            {podcast.podcasterName}
          </AppText>
        </View>
        {podcast.durationSeconds != null ? (
          <View
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              backgroundColor: 'rgba(0,0,0,0.7)',
              borderRadius: radii.sm,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <AppText variant="caption" style={{ color: '#fff', fontSize: 10 }}>
              {formatDuration(podcast.durationSeconds)}
            </AppText>
          </View>
        ) : null}
        <View
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: 'rgba(0,0,0,0.55)',
            borderRadius: radii.full,
            paddingHorizontal: 7,
            paddingVertical: 3,
          }}
        >
          <Ionicons name="logo-youtube" size={11} color="#FF4D4D" />
          <AppText variant="caption" style={{ color: '#fff', fontSize: 10 }}>
            YouTube
          </AppText>
        </View>
        </View>
      </Pressable>

      <View style={{ padding: 12, gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Watch on YouTube"
          onPress={() => void openOnYouTube(podcast.url)}
        >
          <AppText
            variant="subheading"
            numberOfLines={2}
            style={{ fontSize: 13, lineHeight: 18, minHeight: 36 }}
          >
            {podcast.title}
          </AppText>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="eye-outline" size={12} color={colors.textDim} />
          <AppText variant="caption">{formatCount(podcast.viewCount)}</AppText>
          <AppText variant="caption">·</AppText>
          <Ionicons name="thumbs-up-outline" size={11} color={colors.textDim} />
          <AppText variant="caption">{formatCount(podcast.likeCount)}</AppText>
          <AppText variant="caption">·</AppText>
          <AppText variant="caption" numberOfLines={1} style={{ flexShrink: 1 }}>
            {formatRelativeDate(podcast.publishedAt)}
          </AppText>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Make clips from this podcast"
            disabled={busy}
            onPress={onMakeClips}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              height: 34,
              borderRadius: radii.md,
              backgroundColor: colors.primary,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="flash" size={13} color="#fff" />
                <AppText
                  variant="label"
                  style={{ color: '#fff', fontFamily: fonts.semibold }}
                >
                  Make clips
                </AppText>
              </>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Not interested"
            disabled={busy}
            onPress={onNotInterested}
            hitSlop={6}
            style={{
              width: 34,
              height: 34,
              borderRadius: radii.md,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.cardAlt,
              opacity: busy ? 0.6 : 1,
            }}
          >
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
    </Card>
  );
}
