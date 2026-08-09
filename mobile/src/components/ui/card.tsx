import { LinearGradient } from 'expo-linear-gradient';
import { View, type ViewProps } from 'react-native';
import { colors, gradients, radii } from '../../theme';

/**
 * Surface container. Default: flat card color + hairline border.
 * `gradient` adds a subtle top-left sheen for hero/featured surfaces.
 */

export interface CardProps extends ViewProps {
  gradient?: boolean;
  padded?: boolean;
}

export function Card({ gradient = false, padded = true, style, children, ...rest }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radii.xl,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        },
        style,
      ]}
      {...rest}
    >
      {gradient ? (
        <LinearGradient
          colors={[...gradients.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
      <View style={padded ? { padding: 16 } : undefined}>{children}</View>
    </View>
  );
}
