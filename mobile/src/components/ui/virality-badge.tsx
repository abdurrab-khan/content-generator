import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii } from '../../theme';
import { AppText } from './app-text';

/**
 * Virality flame badge — shared by clip cards and video posters.
 * `onImage` adds a dark backing so it stays legible over thumbnails.
 */

export interface ViralityBadgeProps {
  score: number;
  onImage?: boolean;
}

export function viralityColor(score: number): string {
  if (score >= 8) return colors.flame;
  if (score >= 6) return colors.warning;
  return colors.textMuted;
}

export function ViralityBadge({ score, onImage = false }: ViralityBadgeProps) {
  const color = viralityColor(score);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: onImage ? 'rgba(0,0,0,0.6)' : `${color}22`,
        borderColor: `${color}55`,
        borderWidth: 1,
        borderRadius: radii.full,
        paddingHorizontal: 9,
        paddingVertical: 4,
        alignSelf: 'flex-start',
      }}
    >
      <Ionicons name="flame" size={12} color={color} />
      <AppText
        variant="caption"
        style={{ color, fontFamily: fonts.bold, fontSize: 11, lineHeight: 14 }}
      >
        {score.toFixed(1)}
      </AppText>
    </View>
  );
}
