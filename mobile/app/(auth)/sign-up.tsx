import { Pressable, View } from 'react-native';
import { Link } from 'expo-router';
import { AuthLayout } from '../../src/components/auth/auth-layout';
import { SignUpForm } from '../../src/components/auth/sign-up-form';
import { AppText } from '../../src/components/ui/app-text';
import { colors, fonts } from '../../src/theme';

export default function SignUpScreen() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start turning podcasts into viral clips"
      footer={
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <AppText variant="muted">Already have an account?</AppText>
          <Link href="/sign-in" asChild>
            <Pressable hitSlop={8}>
              <AppText
                variant="label"
                style={{ color: colors.primaryBright, fontFamily: fonts.semibold }}
              >
                Sign in
              </AppText>
            </Pressable>
          </Link>
        </View>
      }
    >
      <SignUpForm />
    </AuthLayout>
  );
}
