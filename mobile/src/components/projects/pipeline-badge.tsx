import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { PipelineState } from '../../api/types';
import { isPipelineActive, pipelineMeta } from '../../lib/status';
import { Badge } from '../ui/badge';

/** Status pill for a project's pipeline state, with a live pulsing dot while processing. */

function PulsingDot({ color }: { color: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.25, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width: 6, height: 6, borderRadius: 3, backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

export function PipelineBadge({ state }: { state: PipelineState }) {
  const meta = pipelineMeta[state];
  const active = isPipelineActive(state);
  return (
    <Badge
      label={meta.label}
      color={meta.color}
      icon={active ? <PulsingDot color={meta.color} /> : undefined}
    />
  );
}

/** Compact dot+label variant for the project card meta row. */
export function PipelineDotLabel({ state }: { state: PipelineState }) {
  const meta = pipelineMeta[state];
  const active = isPipelineActive(state);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {active ? (
        <PulsingDot color={meta.color} />
      ) : (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: meta.color }} />
      )}
    </View>
  );
}
