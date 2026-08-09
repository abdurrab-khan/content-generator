import { Pressable } from 'react-native';
import { copyToClipboard } from '../../lib/clipboard';
import { colors, fonts, radii } from '../../theme';
import { AppText } from './app-text';

/** Tag pill — tap to copy the tag (requirement #6). */

export function TagChip({ tag }: { tag: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={`Copies #${tag}`}
      onPress={() => void copyToClipboard(tag, `#${tag} copied`)}
      style={({ pressed }) => ({
        backgroundColor: 'rgba(139,92,246,0.14)',
        borderColor: 'rgba(139,92,246,0.35)',
        borderWidth: 1,
        borderRadius: radii.full,
        paddingHorizontal: 10,
        paddingVertical: 4,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <AppText
        variant="caption"
        style={{ color: colors.primaryBright, fontFamily: fonts.medium, fontSize: 11 }}
      >
        #{tag}
      </AppText>
    </Pressable>
  );
}
