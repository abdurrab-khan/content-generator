import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiError } from '../../api/http';
import { useSession } from '../../session/session-provider';
import { colors } from '../../theme';
import { AppText } from '../ui/app-text';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

/** Email/password registration (better-auth enforces min 8-char passwords). */

export function SignUpForm() {
  const { signUp } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!name.trim()) return setError('Tell us your name.');
    if (!email.trim().includes('@')) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setError(null);
    setSubmitting(true);
    try {
      await signUp(name, email, password);
      // Navigation handled by the (auth) group guard once signed in.
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Sign-up failed — check your connection and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <Input
        label="Name"
        placeholder="Ada Lovelace"
        autoCapitalize="words"
        value={name}
        onChangeText={setName}
        leadingIcon={<Ionicons name="person-outline" size={17} color={colors.textDim} />}
      />
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
        placeholder="At least 8 characters"
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
      <Input
        label="Confirm password"
        placeholder="Repeat it"
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        value={confirm}
        onChangeText={setConfirm}
        leadingIcon={<Ionicons name="shield-checkmark-outline" size={17} color={colors.textDim} />}
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

      <Button label="Create account" onPress={() => void submit()} loading={submitting} fullWidth size="lg" />
    </View>
  );
}
