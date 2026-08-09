import { Alert, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { Project } from '../../api/types';
import { formatRelativeDate } from '../../lib/format';
import { pipelineMeta } from '../../lib/status';
import { colors, gradients, radii } from '../../theme';
import { AppText } from '../ui/app-text';
import { Card } from '../ui/card';
import { PipelineBadge } from './pipeline-badge';

/**
 * Project tile on the home/bin lists — thumbnail with scrim, status badge,
 * title and meta. Long-press or trash icon moves ACTIVE projects to the bin.
 */

export interface ProjectCardProps {
  project: Project;
  onPress: () => void;
  /** Home: soft-delete action (moves the project to the bin). */
  onMoveToBin?: () => void;
  /** Bin: restore action (moves the project back to active). */
  onRestore?: () => void;
  /** Bin: hard-delete action (erases the project and all of its files). */
  onDeleteForever?: () => void;
}

export function ProjectCard({
  project,
  onPress,
  onMoveToBin,
  onRestore,
  onDeleteForever,
}: ProjectCardProps) {
  const meta = pipelineMeta[project.pipelineState];

  const confirmMoveToBin = () => {
    if (!onMoveToBin) return;
    Alert.alert(
      'Move to bin?',
      project.title ?? 'This project',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Move to bin', style: 'destructive', onPress: onMoveToBin },
      ],
    );
  };

  const confirmRestore = () => {
    if (!onRestore) return;
    Alert.alert(
      'Restore project?',
      `"${project.title ?? 'This project'}" will move back to your home screen.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', onPress: onRestore },
      ],
    );
  };

  const confirmDeleteForever = () => {
    if (!onDeleteForever) return;
    Alert.alert(
      'Delete forever?',
      `"${project.title ?? 'This project'}" and everything that belongs to it — clips, ready videos, the source video and the transcript — will be permanently deleted. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete forever', style: 'destructive', onPress: onDeleteForever },
      ],
    );
  };

  const destructiveAction = onDeleteForever ? confirmDeleteForever : onMoveToBin ? confirmMoveToBin : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={destructiveAction}
      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
    >
      <Card padded={false}>
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
              <Ionicons name="film-outline" size={34} color={colors.textDim} />
            </View>
          )}
          <LinearGradient
            colors={[...gradients.thumbnailScrim]}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          />
          <View style={{ position: 'absolute', top: 10, right: 10 }}>
            <PipelineBadge state={project.pipelineState} />
          </View>
          <View
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: 'rgba(0,0,0,0.55)',
              borderRadius: radii.full,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <Ionicons name="logo-youtube" size={12} color="#FF4D4D" />
            <AppText variant="caption" style={{ color: '#fff', fontSize: 10 }}>
              YouTube
            </AppText>
          </View>
        </View>

        <View style={{ padding: 14, gap: 8 }}>
          <AppText variant="subheading" numberOfLines={2} style={{ fontSize: 15, lineHeight: 21 }}>
            {project.title ?? 'Untitled project'}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <AppText variant="caption" style={{ color: meta.color }}>
              {meta.label}
            </AppText>
            <AppText variant="caption">·</AppText>
            <AppText variant="caption">{formatRelativeDate(project.createdAt)}</AppText>
            <View style={{ flex: 1 }} />
            {onRestore ? (
              <Pressable onPress={confirmRestore} hitSlop={10} accessibilityLabel="Restore project">
                <Ionicons name="arrow-undo-outline" size={16} color={colors.info} />
              </Pressable>
            ) : null}
            {onDeleteForever ? (
              <Pressable
                onPress={confirmDeleteForever}
                hitSlop={10}
                accessibilityLabel="Delete forever"
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </Pressable>
            ) : onMoveToBin ? (
              <Pressable onPress={confirmMoveToBin} hitSlop={10} accessibilityLabel="Move to bin">
                <Ionicons name="trash-outline" size={16} color={colors.textDim} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
