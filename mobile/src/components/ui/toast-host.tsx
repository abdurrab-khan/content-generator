import { StyleSheet, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useToastStore, type ToastKind } from "../../store/toast-store";
import { colors, radii } from "../../theme";
import { AppText } from "./app-text";

/** Renders the global toast queue — mount once in the root layout. */

const kindMeta: Record<
  ToastKind,
  { color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  success: { color: colors.success, icon: "checkmark-circle" },
  error: { color: colors.danger, icon: "alert-circle" },
  info: { color: colors.info, icon: "information-circle" },
};

export function ToastHost() {
  const toasts = useToastStore((state) => state.toasts);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + 8 }]}>
      {toasts.map((item) => {
        const meta = kindMeta[item.kind];
        return (
          <Animated.View
            key={item.id}
            entering={FadeInUp.springify().damping(18)}
            exiting={FadeOutUp.duration(160)}
            style={[
              styles.toast,
              {
                borderColor: `${meta.color}55`,
                backgroundColor: colors.cardAlt,
              },
            ]}
          >
            <Ionicons name={meta.icon} size={17} color={meta.color} />
            <AppText
              variant="label"
              style={{ color: colors.text, flexShrink: 1 }}
            >
              {item.message}
            </AppText>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 20,
    right: 20,
    alignItems: "center",
    gap: 8,
    zIndex: 100,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.full,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
