import { useEffect } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { gradients } from '../../theme';

/**
 * Decorative breathing gradient orb — layered soft circles that pulse
 * slowly. Used by the empty-state hero and first-run screens.
 */

export function GradientOrb({ size = 210 }: { size?: number }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.12, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        { width: size, height: size, alignItems: 'center', justifyContent: 'center' },
        animatedStyle,
      ]}
    >
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: 'rgba(124,58,237,0.10)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.72,
          height: size * 0.72,
          borderRadius: (size * 0.72) / 2,
          backgroundColor: 'rgba(139,92,246,0.16)',
        }}
      />
      <LinearGradient
        colors={[...gradients.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size * 0.44,
          height: size * 0.44,
          borderRadius: (size * 0.44) / 2,
          opacity: 0.9,
        }}
      />
    </Animated.View>
  );
}
