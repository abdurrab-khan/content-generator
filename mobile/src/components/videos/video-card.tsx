import {
  Alert,
  FlatList,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import { clipCaptionsUrl } from "../../api/endpoints/clips";
import type { ClipRender, ClipState, RawClip } from "../../api/types";
import { formatDuration, formatRelativeDate } from "../../lib/format";
import {
  buildVideoVersions,
  type VideoVersion,
} from "../../lib/video-versions";
import { colors, gradients, radii } from "../../theme";
import { AppText } from "../ui/app-text";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { CopyableText } from "../ui/copyable-text";
import { MediaActions } from "../ui/media-actions";
import { TagChip } from "../ui/tag-chip";
import { ViralityBadge } from "../ui/virality-badge";
import { VersionDownloadSheet } from "./version-download-sheet";
import { clipStateMeta } from "../../lib/status";

/**
 * Final ready-video card — version slider (original + READY graded variants)
 * with play overlay, preset badges, copyable title/description/tags,
 * save-to-gallery (version chooser when graded variants exist), delete.
 */

export interface VideoCardProps {
  clip: RawClip;
  /** Project thumbnail used as poster art (API has no per-video thumbs). */
  poster: string | null;
  /** Variants of the clip this video was cut from — READY ones join the slider. */
  renders?: ClipRender[];
  /** Play the currently visible version (original or graded). */
  onPlay: (version: VideoVersion) => void;
  /** Permanently delete this video (and the clip it was cut from). */
  onDelete?: () => void;
  /** Virality score of the clip this video was cut from (0–10). */
  viralityScore?: number | null;
}

export function VideoCard({
  clip,
  poster,
  renders = [],
  onPlay,
  onDelete,
  viralityScore,
}: VideoCardProps) {
  const title = clip.title ?? "Untitled video";
  const playable = clip.storagePath !== null;
  const versions = useMemo(
    () => buildVideoVersions(clip, renders, title),
    [clip, renders, title],
  );
  const hasVersions = versions.length > 1;

  const [pageWidth, setPageWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [chooserVisible, setChooserVisible] = useState(false);
  const activeVersion = versions[Math.min(activeIndex, versions.length - 1)];

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth <= 0) return;
    setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / pageWidth));
  };

  const confirmDelete = () => {
    if (!onDelete) return;
    Alert.alert(
      "Delete video?",
      `"${title}" will be permanently deleted, along with the clip it was cut from. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ],
    );
  };

  return (
    <Card padded={false} style={{ opacity: clip.state !== "READY" ? 0.3 : 1 }}>
      <View onLayout={(event) => setPageWidth(event.nativeEvent.layout.width)}>
        <FlatList
          data={versions}
          keyExtractor={(version) => version.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          renderItem={({ item }) => (
            <VersionPoster
              state={clip.state}
              version={item}
              poster={poster}
              duration={clip.duration}
              viralityScore={viralityScore ?? null}
              width={pageWidth}
              disabled={!playable}
              onPlay={() => onPlay(item)}
            />
          )}
        />
        {hasVersions ? (
          <View
            style={{
              position: "absolute",
              bottom: 10,
              left: 0,
              right: 0,
              flexDirection: "row",
              justifyContent: "center",
              gap: 6,
            }}
            pointerEvents="none"
          >
            {versions.map((version, index) => (
              <View
                key={version.key}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor:
                    index === activeIndex ? "#fff" : "rgba(255,255,255,0.45)",
                }}
              />
            ))}
          </View>
        ) : null}
      </View>

      <View style={{ padding: 14, gap: 10 }}>
        <CopyableText
          value={title}
          copyLabel="Title copied"
          variant="subheading"
          numberOfLines={2}
        />

        {clip.description ? (
          <CopyableText
            value={clip.description}
            copyLabel="Description copied"
            variant="muted"
            numberOfLines={2}
          />
        ) : null}

        {clip.tags.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {clip.tags.map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
          </View>
        ) : null}

        <View
          style={{
            gap: 6,
            marginTop: 6,
            flexWrap: "wrap",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <MediaActions
            id={clip.id}
            renders={clip.renders}
            streamUrl={playable ? activeVersion.streamUrl : null}
            filename={activeVersion.filename}
            onPlay={() => onPlay(activeVersion)}
            onSave={hasVersions ? () => setChooserVisible(true) : undefined}
            captionsUrl={clip.id ? clipCaptionsUrl(clip.id) : null}
          />
          <View
            style={{
              gap: 6,
              flex: 0.3,
              flexDirection: "row",
            }}
          >
            <AppText variant="caption">
              {formatRelativeDate(clip.createdAt)}
            </AppText>
            {onDelete ? (
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={confirmDelete}
                hitSlop={10}
                accessibilityLabel="Delete video"
              >
                <Ionicons
                  name="trash-outline"
                  size={17}
                  color={colors.danger}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      <VersionDownloadSheet
        visible={chooserVisible}
        versions={versions}
        onClose={() => setChooserVisible(false)}
      />
    </Card>
  );
}

/** One slider page — poster art, play overlay, duration, and (graded
 *  versions only) a preset badge. The original gets no badge. */
function VersionPoster({
  state,
  version,
  poster,
  duration,
  viralityScore,
  width,
  disabled,
  onPlay,
}: {
  state: ClipState | undefined;
  version: VideoVersion;
  poster: string | null;
  duration: number | null;
  viralityScore: number | null;
  width: number;
  disabled: boolean;
  onPlay: () => void;
}) {
  const stateMeta = state ? clipStateMeta[state] : "";

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`Play ${version.label}`}
      onPress={onPlay}
      disabled={disabled}
    >
      <View
        style={{
          width: width || undefined,
          aspectRatio: 16 / 9,
          backgroundColor: colors.cardAlt,
        }}
      >
        {poster ? (
          <Image
            source={{ uri: poster }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            contentFit="cover"
            transition={200}
          />
        ) : null}
        <LinearGradient
          colors={[...gradients.thumbnailScrim]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        />
        {viralityScore != null ? (
          <View style={{ position: "absolute", top: 10, left: 10 }}>
            <ViralityBadge score={viralityScore} onImage />
          </View>
        ) : null}
        {stateMeta && (
          <View style={{ position: "absolute", top: 10, right: 10 }}>
            <Badge label={stateMeta.label} color={stateMeta.color} />
          </View>
        )}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 27,
              backgroundColor: "rgba(139,92,246,0.9)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="play"
              size={24}
              color="#fff"
              style={{ marginLeft: 2 }}
            />
          </View>
        </View>
        {duration != null ? (
          <View
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              backgroundColor: "rgba(0,0,0,0.65)",
              borderRadius: radii.sm,
              paddingHorizontal: 7,
              paddingVertical: 3,
            }}
          >
            <AppText variant="caption" style={{ color: "#fff", fontSize: 11 }}>
              {formatDuration(duration)}
            </AppText>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
