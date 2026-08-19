import { Pressable, View } from 'react-native';
import { Link } from 'expo-router';
import { AuthLayout } from '../../src/components/auth/auth-layout';
import { SignInForm } from '../../src/components/auth/sign-in-form';
import { AppText } from '../../src/components/ui/app-text';
import { colors, fonts } from '../../src/theme';

export default function SignInScreen() {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your clip studio"
      footer={
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <AppText variant="muted">New here?</AppText>
          <Link href="/sign-up" asChild>
            <Pressable hitSlop={8}>
              <AppText
                variant="label"
                style={{ color: colors.primaryBright, fontFamily: fonts.semibold }}
              >
                Create an account
              </AppText>
            </Pressable>
          </Link>
        </View>
      }
    >
      <SignInForm />
    </AuthLayout>
  );
}
