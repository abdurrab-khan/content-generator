import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { clipCaptionsUrl, clipStreamUrl } from "../../api/endpoints/clips";
import type { Clip, ClipRender } from "../../api/types";
import { formatDuration, formatRange } from "../../lib/format";
import { clipStateMeta, renderStateMeta } from "../../lib/status";
import { buildClipVersions } from "../../lib/video-versions";
import {
  useClipRenders,
  useDeleteClipRender,
} from "../../queries/use-color-grading";
import { colors, fonts, radii } from "../../theme";
import { AppText } from "../ui/app-text";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { CopyableText } from "../ui/copyable-text";
import { MediaActions } from "../ui/media-actions";
import { ViralityBadge } from "../ui/virality-badge";
import { VersionDownloadSheet } from "../videos/version-download-sheet";
import { ColorGradingSheet } from "./color-grading-sheet";

/**
 * Raw clip card — the AI-identified moment: virality score, hook, reason,
 * source time range, cut state, and play/download once READY. READY clips
 * also expose color grading: a preset picker sheet and one chip per rendered
 * variant (the original clip file always stays as-is).
 */

export interface ClipCardProps {
  clip: Clip;
  onPlay: () => void;
  onPlayRender: (render: ClipRender) => void;
}

export function ClipCard({ clip, onPlay, onPlayRender }: ClipCardProps) {
  const info = clip.clipInfo ?? {};
  const ready = clip.state === "READY" && clip.clipPath !== null;
  const stateMeta = clipStateMeta[clip.state];
  const title = info.title ?? "Untitled clip";
  const score =
    typeof info.viralityScore === "number" ? info.viralityScore : null;

  const [sheetVisible, setSheetVisible] = useState(false);
  const [chooserVisible, setChooserVisible] = useState(false);
  const renders = useClipRenders(clip.id);
  const versions = useMemo(
    () => buildClipVersions(clip, renders.data ?? [], title),
    [clip, renders.data, title],
  );

  return (
    <Card style={{ gap: 0 }}>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {score !== null ? <ViralityBadge score={score} /> : null}
          <Badge label={stateMeta.label} color={stateMeta.color} />
          <View style={{ flex: 1 }} />
          <AppText variant="caption" style={{ color: colors.textDim }}>
            {formatRange(clip.start, clip.end)} ·{" "}
            {formatDuration(clip.end - clip.start)}
          </AppText>
        </View>

        <CopyableText
          value={title}
          copyLabel="Title copied"
          variant="subheading"
          numberOfLines={2}
        />

        {info.hook ? (
          <CopyableText
            value={info.hook}
            copyLabel="Hook copied"
            variant="muted"
            numberOfLines={3}
          />
        ) : null}

        {info.reason ? (
          <AppText variant="caption" numberOfLines={2}>
            {info.reason}
          </AppText>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
        >
          <MediaActions
            streamUrl={ready ? clipStreamUrl(clip.id) : null}
            filename={title}
            onPlay={onPlay}
            pendingLabel={ready ? undefined : stateMeta.label}
            onSave={
              versions.length > 1 ? () => setChooserVisible(true) : undefined
            }
            captionsUrl={clipCaptionsUrl(clip.id)}
          />
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Color grade this clip"
            disabled={!ready}
            onPress={() => setSheetVisible(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              height: 36,
              paddingHorizontal: 14,
              borderRadius: radii.full,
              backgroundColor: colors.cardAlt,
              borderWidth: 1,
              borderColor: colors.borderStrong,
              opacity: ready ? 1 : 0.6,
            }}
          >
            <Ionicons
              name="color-palette-outline"
              size={15}
              color={colors.text}
            />
            <AppText variant="label" style={{ color: colors.text }}>
              Grade
            </AppText>
          </TouchableOpacity>
        </ScrollView>

        {(renders.data?.length ?? 0) > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {renders.data?.map((render) => (
              <RenderChip
                key={render.id}
                render={render}
                clipId={clip.id}
                onPlay={() => onPlayRender(render)}
              />
            ))}
          </View>
        ) : null}
      </View>

      <ColorGradingSheet
        visible={sheetVisible}
        clipId={clip.id}
        renders={renders.data ?? []}
        onClose={() => setSheetVisible(false)}
      />

      <VersionDownloadSheet
        visible={chooserVisible}
        versions={versions}
        onClose={() => setChooserVisible(false)}
      />
    </Card>
  );
}

/** One rendered variant — tap to play (when READY), trash to delete. */
function RenderChip({
  render,
  clipId,
  onPlay,
}: {
  render: ClipRender;
  clipId: string;
  onPlay: () => void;
}) {
  const deleteRender = useDeleteClipRender(clipId);
  const stateMeta = renderStateMeta[render.state];
  const playable = render.state === "READY";
  const label = render.colorGradingPreset?.name ?? "Variant";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 34,
        paddingLeft: 12,
        paddingRight: 8,
        borderRadius: radii.full,
        backgroundColor: `${stateMeta.color}14`,
        borderWidth: 1,
        borderColor: `${stateMeta.color}44`,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Play variant ${label}`}
        disabled={!playable}
        onPress={onPlay}
        style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
      >
        {playable ? (
          <Ionicons name="play" size={12} color={stateMeta.color} />
        ) : null}
        <AppText
          variant="caption"
          style={{ color: stateMeta.color, fontFamily: fonts.semibold }}
        >
          {label}
          {playable ? "" : ` · ${stateMeta.label}`}
        </AppText>
      </TouchableOpacity>
      {render.state === "READY" || render.state === "FAILED" ? (
        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Delete variant ${label}`}
          disabled={deleteRender.isPending}
          onPress={() => deleteRender.mutate(render.id)}
          hitSlop={6}
        >
          <Ionicons name="close" size={13} color={stateMeta.color} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
