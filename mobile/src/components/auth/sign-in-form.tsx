import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiError } from '../../api/http';
import { useSession } from '../../session/session-provider';
import { colors } from '../../theme';
import { AppText } from '../ui/app-text';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

/** Email/password sign-in against better-auth (bearer token session). */

export function SignInForm() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      // Navigation handled by the (auth) group guard once signed in.
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Sign-in failed — check your connection and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <Input
        label="Email"
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        leadingIcon={<Ionicons name="mail-outline" size={17} color={colors.textDim} />}
      />
      <Input
        label="Password"
        placeholder="••••••••"
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
        leadingIcon={<Ionicons name="lock-closed-outline" size={17} color={colors.textDim} />}
        trailing={
          <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.textDim}
            />
          </Pressable>
        }
      />

      {error ? (
        <View
          style={{
            backgroundColor: 'rgba(248,113,113,0.10)',
            borderColor: 'rgba(248,113,113,0.35)',
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
          }}
        >
          <AppText variant="caption" style={{ color: colors.danger }}>
            {error}
          </AppText>
        </View>
      ) : null}

      <Button label="Sign in" onPress={() => void submit()} loading={submitting} fullWidth size="lg" />
    </View>
  );
}
