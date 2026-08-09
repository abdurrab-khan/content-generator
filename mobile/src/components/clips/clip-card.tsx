import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clipStreamUrl } from '../../api/endpoints/clips';
import type { Clip } from '../../api/types';
import { formatDuration, formatRange } from '../../lib/format';
import { clipStateMeta } from '../../lib/status';
import { colors, fonts, radii } from '../../theme';
import { AppText } from '../ui/app-text';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { CopyableText } from '../ui/copyable-text';
import { MediaActions } from '../ui/media-actions';

/**
 * Raw clip card — the AI-identified moment: virality score, hook, reason,
 * source time range, cut state, and play/download once READY.
 */

export interface ClipCardProps {
  clip: Clip;
  onPlay: () => void;
}

function viralityColor(score: number): string {
  if (score >= 8) return colors.flame;
  if (score >= 6) return colors.warning;
  return colors.textMuted;
}

export function ClipCard({ clip, onPlay }: ClipCardProps) {
  const info = clip.clipInfo ?? {};
  const ready = clip.state === 'READY' && clip.clipPath !== null;
  const stateMeta = clipStateMeta[clip.state];
  const title = info.title ?? 'Untitled clip';
  const score = typeof info.viralityScore === 'number' ? info.viralityScore : null;

  return (
    <Card style={{ gap: 0 }}>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {score !== null ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: `${viralityColor(score)}22`,
                borderColor: `${viralityColor(score)}55`,
                borderWidth: 1,
                borderRadius: radii.full,
                paddingHorizontal: 9,
                paddingVertical: 4,
              }}
            >
              <Ionicons name="flame" size={12} color={viralityColor(score)} />
              <AppText
                variant="caption"
                style={{
                  color: viralityColor(score),
                  fontFamily: fonts.bold,
                  fontSize: 11,
                  lineHeight: 14,
                }}
              >
                {score.toFixed(1)}
              </AppText>
            </View>
          ) : null}
          <Badge label={stateMeta.label} color={stateMeta.color} />
          <View style={{ flex: 1 }} />
          <AppText variant="caption" style={{ color: colors.textDim }}>
            {formatRange(clip.start, clip.end)} · {formatDuration(clip.end - clip.start)}
          </AppText>
        </View>

        <CopyableText value={title} copyLabel="Title copied" variant="subheading" numberOfLines={2} />

        {info.hook ? (
          <CopyableText value={info.hook} copyLabel="Hook copied" variant="muted" numberOfLines={3} />
        ) : null}

        {info.reason ? (
          <AppText variant="caption" numberOfLines={2}>
            {info.reason}
          </AppText>
        ) : null}

        <MediaActions
          streamUrl={ready ? clipStreamUrl(clip.id) : null}
          filename={title}
          onPlay={onPlay}
          pendingLabel={ready ? undefined : stateMeta.label}
        />
      </View>
    </Card>
  );
}
