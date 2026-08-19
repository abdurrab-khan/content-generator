import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useSession } from '../src/session/session-provider';
import { AppText } from '../src/components/ui/app-text';
import { Button } from '../src/components/ui/button';
import { colors } from '../src/theme';

/**
 * Entry route — restores/validates the session, then redirects to the
 * signed-in app or the auth flow.
 */
export default function Index() {
  const { status, bootError, retryBootstrap } = useSession();

  if (bootError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          padding: 32,
        }}
      >
        <Ionicons name="cloud-offline-outline" size={40} color={colors.textDim} />
        <AppText variant="subheading" style={{ textAlign: 'center' }}>
          Can&apos;t reach the server
        </AppText>
        <AppText variant="muted" style={{ textAlign: 'center' }}>
          {bootError}
        </AppText>
        <Button label="Retry" onPress={retryBootstrap} variant="secondary" />
      </View>
    );
  }

  if (status === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.primaryBright} />
      </View>
    );
  }

  if (status === 'signedIn') return <Redirect href="/home" />;
  return <Redirect href="/sign-in" />;
}
