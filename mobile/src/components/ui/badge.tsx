import { View } from 'react-native';
import { colors, fonts, radii } from '../../theme';
import { AppText } from './app-text';

/**
 * Small status pill — tinted background derived from the given color.
 */

export interface BadgeProps {
  label: string;
  color?: string;
  icon?: React.ReactNode;
}

export function Badge({ label, color = colors.textMuted, icon }: BadgeProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: `${color}22`,
        borderColor: `${color}55`,
        borderWidth: 1,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: radii.full,
        alignSelf: 'flex-start',
      }}
    >
      {icon}
      <AppText
        variant="caption"
        style={{ color, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14 }}
      >
        {label}
      </AppText>
    </View>
  );
}
