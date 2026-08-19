import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
  View,
} from "react-native";
import { useMediaDownload } from "../../lib/use-media-download";
import { colors, fonts, radii } from "../../theme";
import { AppText } from "./app-text";

/**
 * Play + download action row shared by clip / video / raw-video cards.
 * When the file isn't ready yet, actions render disabled with the reason.
 */

export interface MediaActionsProps {
  /** Authenticated stream URL, or null when the file isn't produced yet. */
  streamUrl: string | null;
  filename: string;
  onPlay: () => void;
  /** Why actions are disabled, e.g. "Cutting…" / "Downloading…". */
  pendingLabel?: string;
}

export function MediaActions({
  streamUrl,
  filename,
  onPlay,
  pendingLabel,
}: MediaActionsProps) {
  const { progress, downloading, start } = useMediaDownload();
  const ready = streamUrl !== null;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <TouchableOpacity
        activeOpacity={0.7}
        accessibilityRole="button"
        disabled={!ready}
        onPress={onPlay}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          height: 36,
          paddingHorizontal: 16,
          borderRadius: radii.full,
          backgroundColor: ready ? colors.primary : colors.cardAlt,
          opacity: ready ? 1 : 0.6,
        }}
      >
        <Ionicons name="play" size={14} color="#fff" />
        <AppText
          variant="label"
          style={{ color: "#fff", fontFamily: fonts.semibold }}
        >
          Play
        </AppText>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Download video"
        disabled={!ready || downloading}
        onPress={() => streamUrl && void start(streamUrl, filename)}
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

      {!ready && pendingLabel ? (
        <AppText variant="caption" style={{ marginLeft: 2 }}>
          {pendingLabel}
        </AppText>
      ) : null}
    </View>
  );
}
