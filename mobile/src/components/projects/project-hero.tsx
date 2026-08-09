import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ProjectDetail } from '../../api/types';
import { copyToClipboard } from '../../lib/clipboard';
import { formatRelativeDate } from '../../lib/format';
import { colors, gradients, radii } from '../../theme';
import { AppText } from '../ui/app-text';
import { CopyableText } from '../ui/copyable-text';
import { IconButton } from '../ui/icon-button';
import { PipelineBadge } from './pipeline-badge';

/** Detail header — full-bleed thumbnail with scrim, back control, status. */

export interface ProjectHeroProps {
  project: ProjectDetail;
  onBack: () => void;
}

export function ProjectHero({ project, onBack }: ProjectHeroProps) {
  return (
    <View>
      <View style={{ aspectRatio: 16 / 9, backgroundColor: colors.cardAlt }}>
        {project.thumbnail ? (
          <Image
            source={{ uri: project.thumbnail }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="film-outline" size={40} color={colors.textDim} />
          </View>
        )}
        <LinearGradient
          colors={[...gradients.thumbnailScrim]}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
        <View style={{ position: 'absolute', top: 8, left: 8 }}>
          <IconButton
            icon="chevron-back"
            onPress={onBack}
            variant="surface"
            accessibilityLabel="Back"
          />
        </View>
        <View style={{ position: 'absolute', top: 12, right: 12 }}>
          <PipelineBadge state={project.pipelineState} />
        </View>
      </View>

      <View style={{ padding: 20, gap: 10 }}>
        <CopyableText
          value={project.title ?? 'Untitled project'}
          copyLabel="Title copied"
          variant="heading"
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Copies the source link"
            onPress={() => void copyToClipboard(project.sourceUrl, 'Source link copied')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radii.full,
              paddingHorizontal: 10,
              paddingVertical: 5,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="logo-youtube" size={12} color="#FF4D4D" />
            <AppText variant="caption" style={{ color: colors.textMuted }}>
              Source link
            </AppText>
            <Ionicons name="copy-outline" size={11} color={colors.textDim} />
          </Pressable>
          <AppText variant="caption">{formatRelativeDate(project.createdAt)}</AppText>
        </View>
      </View>
    </View>
  );
}
