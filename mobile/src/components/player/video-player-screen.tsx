import { ActivityIndicator, View } from 'react-native';
import { useEvent } from 'expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { clipStreamUrl } from '../../api/endpoints/clips';
import { renderStreamUrl } from '../../api/endpoints/color-grading';
import { rawVideoStreamUrl } from '../../api/endpoints/raw-videos';
import { videoStreamUrl } from '../../api/endpoints/videos';
import { getAuthToken } from '../../api/http';
import { useMediaDownload } from '../../lib/use-media-download';
import { colors } from '../../theme';
import { AppText } from '../ui/app-text';
import { IconButton } from '../ui/icon-button';

/**
 * Fullscreen modal player (requirement #8) — expo-video with native controls
 * and authenticated streaming (Bearer header). Handles ready videos, cut
 * clips and raw source videos via the `kind` param.
 */

export type MediaKind = 'video' | 'clip' | 'raw' | 'render';

function streamUrlFor(kind: MediaKind, id: string): string {
  if (kind === 'clip') return clipStreamUrl(id);
  if (kind === 'raw') return rawVideoStreamUrl(id);
  if (kind === 'render') return renderStreamUrl(id);
  return videoStreamUrl(id);
}

export function VideoPlayerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; kind?: MediaKind; title?: string }>();
  const kind: MediaKind =
    params.kind === 'clip' || params.kind === 'raw' || params.kind === 'render'
      ? params.kind
      : 'video';
  const id = params.id ?? '';
  const title = params.title ?? 'Player';
  const url = streamUrlFor(kind, id);

  const token = getAuthToken();
  const { progress, downloading, start } = useMediaDownload();

  const player = useVideoPlayer(
    { uri: url, headers: token ? { Authorization: `Bearer ${token}` } : undefined },
    (instance) => {
      instance.play();
    },
  );

  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const playerReady = status === 'readyToPlay';

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 8,
          paddingTop: 8,
          paddingBottom: 4,
        }}
      >
        <IconButton
          icon="chevron-down"
          onPress={() => router.back()}
          accessibilityLabel="Close player"
        />
        <AppText variant="label" style={{ flex: 1, color: colors.text }} numberOfLines={1}>
          {title}
        </AppText>
        {downloading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 10 }}>
            <ActivityIndicator size="small" color={colors.primaryBright} />
            <AppText variant="caption" style={{ color: colors.primaryBright }}>
              {Math.round((progress ?? 0) * 100)}%
            </AppText>
          </View>
        ) : (
          <IconButton
            icon="download-outline"
            onPress={() => void start(url, title)}
            accessibilityLabel="Download video"
          />
        )}
      </View>

      <View style={{ flex: 1 }}>
        {!playerReady ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            <ActivityIndicator size="large" color={colors.primaryBright} />
            <AppText variant="caption">Loading video…</AppText>
          </View>
        ) : null}
        <VideoView
          player={player}
          style={{ flex: 1 }}
          contentFit="contain"
          nativeControls
        />
      </View>
    </View>
  );
}
