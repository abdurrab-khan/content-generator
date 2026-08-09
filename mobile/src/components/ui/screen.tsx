import { View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors } from '../../theme';

/**
 * Screen shell — dark background + safe-area handling. Screens compose
 * their own scroll views / lists inside.
 */

export interface ScreenProps {
  children: React.ReactNode;
  edges?: Edge[];
  padded?: boolean;
}

export function Screen({ children, edges = ['top'], padded = true }: ScreenProps) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView
        edges={edges}
        style={{ flex: 1, paddingHorizontal: padded ? 20 : 0 }}
      >
        {children}
      </SafeAreaView>
    </View>
  );
}
