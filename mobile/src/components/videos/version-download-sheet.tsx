import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { useMediaDownload } from '../../lib/use-media-download';
import type { VideoVersion } from '../../lib/video-versions';
import { colors, fonts, radii } from '../../theme';
import { AppText } from '../ui/app-text';
import { Badge } from '../ui/badge';
import { Sheet } from '../ui/sheet';

/**
 * Download chooser shown when more than one version exists (original +
 * graded variants). Each row can be previewed in the player before saving.
 * Single-version cards never open this — they download directly.
 */

export interface VersionDownloadSheetProps {
  visible: boolean;
  versions: VideoVersion[];
  onClose: () => void;
}

export function VersionDownloadSheet({
  visible,
  versions,
  onClose,
}: VersionDownloadSheetProps) {
  const router = useRouter();
  const { progress, downloading, start } = useMediaDownload();

  const preview = (version: VideoVersion) => {
    onClose();
    router.push({
      pathname: '/player/[id]',
      params: {
        id: version.playerId,
        kind: version.playerKind,
        title: version.filename,
      },
    });
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Download version">
      <View style={{ gap: 8 }}>
        {versions.map((version) => (
          <View
            key={version.key}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 14,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.borderStrong,
              backgroundColor: colors.cardAlt,
            }}
          >
            <Ionicons
              name={version.isOriginal ? 'film-outline' : 'color-palette-outline'}
              size={18}
              color={version.isOriginal ? colors.textDim : colors.primaryBright}
            />
            <View style={{ flex: 1 }}>
              {version.isOriginal ? (
                <AppText variant="label" style={{ fontFamily: fonts.semibold }}>
                  Original
                </AppText>
              ) : (
                <Badge label={version.label} color={colors.primaryBright} />
              )}
            </View>
            <TouchableOpacity
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Preview ${version.label}`}
              onPress={() => preview(version)}
              style={{
                width: 34,
                height: 34,
                borderRadius: radii.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.borderStrong,
              }}
            >
              <Ionicons
                name="play"
                size={14}
                color={colors.text}
                style={{ marginLeft: 1 }}
              />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Download ${version.label}`}
              disabled={downloading}
              onPress={() => void start(version.streamUrl, version.filename)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                height: 34,
                paddingHorizontal: 14,
                borderRadius: radii.full,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.borderStrong,
                opacity: downloading ? 0.5 : 1,
              }}
            >
              {downloading ? (
                <>
                  <ActivityIndicator size="small" color={colors.primaryBright} />
                  <AppText variant="label" style={{ color: colors.primaryBright }}>
                    {Math.round((progress ?? 0) * 100)}%
                  </AppText>
                </>
              ) : (
                <>
                  <Ionicons name="download-outline" size={15} color={colors.text} />
                  <AppText variant="label" style={{ color: colors.text }}>
                    Save
                  </AppText>
                </>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </Sheet>
  );
}
