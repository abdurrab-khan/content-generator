import { Text, type TextProps, type TextStyle } from 'react-native';
import { colors, fonts } from '../../theme';

/**
 * Typography primitive — every piece of text in the app goes through here
 * so font family, size and color stay consistent. `className` (NativeWind)
 * and `style` both merge on top of the variant.
 */

export type TextVariant =
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'muted'
  | 'caption'
  | 'label';

const variantStyles: Record<TextVariant, TextStyle> = {
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, color: colors.text },
  heading: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, color: colors.text },
  subheading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.text },
  muted: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.textDim },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.textMuted },
};

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  className?: string;
}

export function AppText({ variant = 'body', style, className, ...rest }: AppTextProps) {
  return (
    <Text className={className} style={[variantStyles[variant], style]} {...rest} />
  );
}
