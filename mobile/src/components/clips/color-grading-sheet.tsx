import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, FlatList, TouchableOpacity, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { presetPreviewUrl } from '../../api/endpoints/color-grading';
import { getAuthToken } from '../../api/http';
import type { ClipRender, ColorGradingPreset } from '../../api/types';
import { renderStateMeta } from '../../lib/status';
import { useColorGradingPresets, useCreateClipRender } from '../../queries/use-color-grading';
import { colors, fonts, radii } from '../../theme';
import { AppText } from '../ui/app-text';
import { Button } from '../ui/button';
import { Sheet } from '../ui/sheet';

/**
 * Preset picker opened from the clip card. Sections are the extension point:
 * audio tracks and other effects slot in next to the preset list later, and
 * Submit then sends the whole combination in one render request.
 */

export interface ColorGradingSheetProps {
  visible: boolean;
  clipId: string;
  /** Existing variants — presets already rendered render disabled. */
  renders: ClipRender[];
  onClose: () => void;
}

export function ColorGradingSheet({
  visible,
  clipId,
  renders,
  onClose,
}: ColorGradingSheetProps) {
  const presets = useColorGradingPresets();
  const createRender = useCreateClipRender(clipId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const renderByPresetId = new Map(
    renders
      .filter((render) => render.colorGradingPresetId !== null)
      .map((render) => [render.colorGradingPresetId as string, render]),
  );

  const submit = () => {
    if (!selectedId) return;
    createRender.mutate(selectedId, { onSuccess: () => setSelectedId(null) });
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Color grading">
      {presets.isPending ? (
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <ActivityIndicator size="large" color={colors.primaryBright} />
        </View>
      ) : (
        <FlatList
          data={presets.data ?? []}
          keyExtractor={(preset) => preset.id}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item: preset }) => (
            <PresetRow
              preset={preset}
              selected={preset.id === selectedId}
              existing={renderByPresetId.get(preset.id) ?? null}
              onPress={() => setSelectedId(preset.id)}
            />
          )}
        />
      )}
      <Button
        label="Apply grading"
        onPress={submit}
        disabled={!selectedId}
        loading={createRender.isPending}
        fullWidth
        style={{ marginTop: 16 }}
      />
      <AppText
        variant="caption"
        style={{ textAlign: 'center', marginTop: 8, color: colors.textDim }}
      >
        Previews show each look on the same clip
      </AppText>
    </Sheet>
  );
}

interface PresetRowProps {
  preset: ColorGradingPreset;
  selected: boolean;
  /** Existing variant for this preset, if the clip already has one. */
  existing: ClipRender | null;
  onPress: () => void;
}

function PresetRow({ preset, selected, existing, onPress }: PresetRowProps) {
  const taken = existing !== null && existing.state !== 'FAILED';
  const stateMeta = existing ? renderStateMeta[existing.state] : null;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      accessibilityRole="button"
      disabled={taken}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 10,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: selected ? colors.primaryBright : colors.borderStrong,
        backgroundColor: selected ? `${colors.primaryBright}14` : colors.cardAlt,
        opacity: taken ? 0.55 : 1,
      }}
    >
      <PresetPreview preset={preset} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppText variant="label" style={{ fontFamily: fonts.semibold }}>
            {preset.name}
          </AppText>
          {taken && stateMeta ? (
            <AppText variant="caption" style={{ color: stateMeta.color }}>
              {stateMeta.label}
            </AppText>
          ) : null}
        </View>
        {preset.bestFor ? (
          <AppText
            variant="caption"
            style={{ color: colors.primaryBright }}
            numberOfLines={1}
          >
            {preset.bestFor}
          </AppText>
        ) : null}
        {preset.description ? (
          <AppText variant="caption" numberOfLines={2}>
            {preset.description}
          </AppText>
        ) : null}
      </View>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={selected ? colors.primaryBright : colors.textDim}
      />
    </TouchableOpacity>
  );
}

/**
 * Muted auto-playing preview loop for one preset. Only mounted while the
 * sheet is open (sheets unmount on close), so no battery drain in lists.
 * Falls back to a static tile when the preview hasn't been generated yet.
 */
function PresetPreview({ preset }: { preset: ColorGradingPreset }) {
  const token = getAuthToken();
  const hasPreview = preset.previewPath !== null;
  const player = useVideoPlayer(
    hasPreview
      ? {
          uri: presetPreviewUrl(preset.id),
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      : null,
    (instance) => {
      instance.loop = true;
      instance.muted = true;
      instance.play();
    },
  );

  return (
    <View
      style={{
        width: 96,
        height: 54,
        borderRadius: radii.md,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {hasPreview ? (
        <VideoView
          player={player}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          nativeControls={false}
          pointerEvents="none"
        />
      ) : (
        <Ionicons name="color-palette-outline" size={20} color={colors.textDim} />
      )}
    </View>
  );
}
