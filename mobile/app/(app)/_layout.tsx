import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useSession } from '../../src/session/session-provider';
import { colors } from '../../src/theme';

/** Signed-in group — guards every app screen behind a valid session. */
export default function AppGroupLayout() {
  const { status } = useSession();

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

  if (status === 'signedOut') return <Redirect href="/sign-in" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
