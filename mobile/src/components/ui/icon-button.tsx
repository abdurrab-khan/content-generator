import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { colors, radii } from '../../theme';

/** Circular icon-only button. */

export interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string;
  variant?: 'ghost' | 'surface';
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function IconButton({
  icon,
  onPress,
  size = 22,
  color = colors.text,
  variant = 'ghost',
  disabled = false,
  accessibilityLabel,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor:
          variant === 'surface' ? colors.cardAlt : pressed ? 'rgba(255,255,255,0.08)' : 'transparent',
        borderWidth: variant === 'surface' ? 1 : 0,
        borderColor: colors.border,
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}
