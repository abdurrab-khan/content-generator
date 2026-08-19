import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { rawVideoStreamUrl } from '../../api/endpoints/raw-videos';
import type { RawVideo } from '../../api/types';
import { formatRelativeDate } from '../../lib/format';
import { downloadStateMeta } from '../../lib/status';
import { colors, radii } from '../../theme';
import { AppText } from '../ui/app-text';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { CopyableText } from '../ui/copyable-text';
import { MediaActions } from '../ui/media-actions';
import { TagChip } from '../ui/tag-chip';

/**
 * Source (raw) video card — the downloaded podcast the clips were cut from.
 */

export interface RawVideoCardProps {
  rawVideo: RawVideo;
  onPlay: () => void;
}

export function RawVideoCard({ rawVideo, onPlay }: RawVideoCardProps) {
  const ready = rawVideo.downloadState === 'DOWNLOADED' && rawVideo.videoPath !== null;
  const meta = downloadStateMeta[rawVideo.downloadState];
  const title = rawVideo.title ?? 'Source video';

  return (
    <Card>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: radii.md,
              backgroundColor: colors.cardAlt,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="film-outline" size={18} color={colors.info} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="label" style={{ color: colors.text }} numberOfLines={1}>
              Source download
            </AppText>
            <AppText variant="caption">{formatRelativeDate(rawVideo.createdAt)}</AppText>
          </View>
          <Badge label={meta.label} color={meta.color} />
        </View>

        <CopyableText value={title} copyLabel="Title copied" variant="subheading" numberOfLines={2} />

        {rawVideo.description ? (
          <CopyableText
            value={rawVideo.description}
            copyLabel="Description copied"
            variant="muted"
            numberOfLines={3}
          />
        ) : null}

        {rawVideo.tags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {rawVideo.tags.map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
          </View>
        ) : null}

        <MediaActions
          streamUrl={ready ? rawVideoStreamUrl(rawVideo.id) : null}
          filename={title}
          onPlay={onPlay}
          pendingLabel={ready ? undefined : meta.label}
        />
      </View>
    </Card>
  );
}
