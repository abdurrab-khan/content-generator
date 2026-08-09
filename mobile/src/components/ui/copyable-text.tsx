import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { copyToClipboard } from '../../lib/clipboard';
import { colors } from '../../theme';
import { AppText, type TextVariant } from './app-text';

/**
 * Tap-to-copy text (requirement #6) — used for titles, descriptions, hooks.
 * Shows a subtle copy affordance and confirms via toast + haptic.
 */

export interface CopyableTextProps {
  /** The value placed on the clipboard. */
  value: string | null | undefined;
  /** Toast label, e.g. "Title copied". */
  copyLabel?: string;
  variant?: TextVariant;
  numberOfLines?: number;
  showIcon?: boolean;
}

export function CopyableText({
  value,
  copyLabel = 'Copied',
  variant = 'body',
  numberOfLines,
  showIcon = true,
}: CopyableTextProps) {
  if (!value) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Copies to clipboard"
      onPress={() => void copyToClipboard(value, copyLabel)}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
        <AppText variant={variant} numberOfLines={numberOfLines} style={{ flexShrink: 1 }}>
          {value}
        </AppText>
        {showIcon ? (
          <Ionicons
            name="copy-outline"
            size={12}
            color={colors.textDim}
            style={{ marginTop: 4 }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}
