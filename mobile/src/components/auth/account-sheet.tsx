import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../session/session-provider';
import { colors, radii } from '../../theme';
import { AppText } from '../ui/app-text';
import { Sheet } from '../ui/sheet';

/**
 * Account menu — user identity + sign out. Signing out clears the query
 * cache so no data leaks between users on a shared device.
 */

export interface AccountSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function AccountSheet({ visible, onClose }: AccountSheetProps) {
  const { user, signOut } = useSession();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    onClose();
    await signOut();
    queryClient.clear();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Account">
      <View style={{ gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: radii.full,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText variant="heading" style={{ color: '#fff' }}>
              {(user?.name ?? '?').slice(0, 1).toUpperCase()}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="subheading" numberOfLines={1}>
              {user?.name}
            </AppText>
            <AppText variant="caption" numberOfLines={1}>
              {user?.email}
            </AppText>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => void handleSignOut()}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: 14,
            borderRadius: radii.lg,
            backgroundColor: 'rgba(248,113,113,0.10)',
            borderWidth: 1,
            borderColor: 'rgba(248,113,113,0.35)',
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Ionicons name="log-out-outline" size={17} color={colors.danger} />
          <AppText variant="label" style={{ color: colors.danger }}>
            Sign out
          </AppText>
        </Pressable>
      </View>
    </Sheet>
  );
}
