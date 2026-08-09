import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, gradients, radii } from '../../theme';
import { AppText } from './app-text';

/**
 * Button variants:
 *  - primary: violet → fuchsia gradient, white label
 *  - secondary: elevated surface, bordered
 *  - ghost: transparent, muted label
 *  - danger: tinted red surface
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const sizeStyles: Record<ButtonSize, { height: number; paddingHorizontal: number; textSize: number }> = {
  sm: { height: 36, paddingHorizontal: 14, textSize: 13 },
  md: { height: 48, paddingHorizontal: 20, textSize: 15 },
  lg: { height: 56, paddingHorizontal: 24, textSize: 16 },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
}: ButtonProps) {
  const { height, paddingHorizontal, textSize } = sizeStyles[size];
  const isDisabled = disabled || loading;

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.textMuted} size="small" />
      ) : (
        <>
          {icon}
          <AppText
            variant="subheading"
            style={{
              fontSize: textSize,
              color:
                variant === 'primary'
                  ? '#fff'
                  : variant === 'danger'
                    ? colors.danger
                    : variant === 'ghost'
                      ? colors.textMuted
                      : colors.text,
            }}
          >
            {label}
          </AppText>
        </>
      )}
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height,
          borderRadius: radii.lg,
          overflow: 'hidden',
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={[...gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fill, { paddingHorizontal }]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.fill,
            {
              paddingHorizontal,
              backgroundColor:
                variant === 'secondary'
                  ? colors.cardAlt
                  : variant === 'danger'
                    ? 'rgba(248,113,113,0.12)'
                    : 'transparent',
              borderWidth: variant === 'secondary' ? 1 : 0,
              borderColor: colors.borderStrong,
            },
          ]}
        >
          {content}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
