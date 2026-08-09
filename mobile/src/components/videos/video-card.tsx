import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { videoStreamUrl } from '../../api/endpoints/videos';
import type { Video } from '../../api/types';
import { formatDuration, formatRelativeDate } from '../../lib/format';
import { colors, gradients, radii } from '../../theme';
import { AppText } from '../ui/app-text';
import { Card } from '../ui/card';
import { CopyableText } from '../ui/copyable-text';
import { MediaActions } from '../ui/media-actions';
import { TagChip } from '../ui/tag-chip';

/**
 * Final ready-video card — poster with play overlay + duration, copyable
 * title/description/tags, save-to-gallery action.
 */

export interface VideoCardProps {
  video: Video;
  /** Project thumbnail used as poster art (API has no per-video thumbs). */
  poster: string | null;
  onPlay: () => void;
}

export function VideoCard({ video, poster, onPlay }: VideoCardProps) {
  const title = video.title ?? 'Untitled video';
  const playable = video.storagePath !== null;

  return (
    <Card padded={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Play ${title}`}
        onPress={onPlay}
        disabled={!playable}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      >
        <View style={{ aspectRatio: 16 / 9, backgroundColor: colors.cardAlt }}>
          {poster ? (
            <Image
              source={{ uri: poster }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              contentFit="cover"
              transition={200}
            />
          ) : null}
          <LinearGradient
            colors={[...gradients.thumbnailScrim]}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          />
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor: 'rgba(139,92,246,0.9)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="play" size={24} color="#fff" style={{ marginLeft: 2 }} />
            </View>
          </View>
          {video.duration != null ? (
            <View
              style={{
                position: 'absolute',
                bottom: 10,
                right: 10,
                backgroundColor: 'rgba(0,0,0,0.65)',
                borderRadius: radii.sm,
                paddingHorizontal: 7,
                paddingVertical: 3,
              }}
            >
              <AppText variant="caption" style={{ color: '#fff', fontSize: 11 }}>
                {formatDuration(video.duration)}
              </AppText>
            </View>
          ) : null}
        </View>
      </Pressable>

      <View style={{ padding: 14, gap: 10 }}>
        <CopyableText value={title} copyLabel="Title copied" variant="subheading" numberOfLines={2} />

        {video.description ? (
          <CopyableText
            value={video.description}
            copyLabel="Description copied"
            variant="muted"
            numberOfLines={2}
          />
        ) : null}

        {video.tags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {video.tags.map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <MediaActions
            streamUrl={playable ? videoStreamUrl(video.id) : null}
            filename={title}
            onPlay={onPlay}
          />
          <View style={{ flex: 1 }} />
          <AppText variant="caption">{formatRelativeDate(video.createdAt)}</AppText>
        </View>
      </View>
    </Card>
  );
}
