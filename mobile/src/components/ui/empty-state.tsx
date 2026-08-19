import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { colors, radii } from '../../theme';
import { AppText } from './app-text';

/** Friendly placeholder for empty lists/tabs. */

export interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  children?: React.ReactNode;
}

export function EmptyState({ icon, title, message, children }: EmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 12 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radii.full,
          backgroundColor: colors.cardAlt,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        <Ionicons name={icon} size={26} color={colors.primaryBright} />
      </View>
      <AppText variant="subheading" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="muted" style={{ textAlign: 'center' }}>
          {message}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}
