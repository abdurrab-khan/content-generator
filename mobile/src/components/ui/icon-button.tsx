import { Ionicons } from "@expo/vector-icons";
import { Pressable, TouchableOpacity } from "react-native";
import { colors, radii } from "../../theme";

/** Circular icon-only button. */

export interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string;
  variant?: "ghost" | "surface";
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function IconButton({
  icon,
  onPress,
  size = 22,
  color = colors.text,
  variant = "ghost",
  disabled = false,
  accessibilityLabel,
}: IconButtonProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={{
        width: 40,
        height: 40,
        borderRadius: radii.full,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: variant === "surface" ? colors.cardAlt : "transparent",
        borderWidth: variant === "surface" ? 1 : 0,
        borderColor: colors.border,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Ionicons name={icon} size={size} color={color} />
    </TouchableOpacity>
  );
}
