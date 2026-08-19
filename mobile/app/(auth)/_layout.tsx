import { Redirect, Stack } from 'expo-router';
import { useSession } from '../../src/session/session-provider';
import { colors } from '../../src/theme';

/** Auth group — redirects into the app once a session exists. */
export default function AuthGroupLayout() {
  const { status } = useSession();
  if (status === 'signedIn') return <Redirect href="/home" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
