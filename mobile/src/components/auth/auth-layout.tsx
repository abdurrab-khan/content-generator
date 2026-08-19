import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { colors, fonts, gradients, radii } from '../../theme';
import { AppText } from '../ui/app-text';

/**
 * Shared frame for sign-in / sign-up — ambient gradient glow, brand mark,
 * headline, form slot and a footer slot (mode switch link).
 */

export interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={[...gradients.hero]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 340 }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingVertical: 48,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <LinearGradient
              colors={[...gradients.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 58,
                height: 58,
                borderRadius: radii.lg,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <Ionicons name="flash" size={28} color="#fff" />
            </LinearGradient>
            <AppText
              variant="caption"
              style={{ letterSpacing: 4, fontFamily: fonts.bold, color: colors.textMuted }}
            >
              CLIPFORGE
            </AppText>
          </View>

          <AppText variant="title" style={{ textAlign: 'center' }}>
            {title}
          </AppText>
          <AppText variant="muted" style={{ textAlign: 'center', marginTop: 8, marginBottom: 28 }}>
            {subtitle}
          </AppText>

          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: radii.xl,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 20,
              gap: 16,
            }}
          >
            {children}
          </View>

          <View style={{ marginTop: 22, alignItems: 'center' }}>{footer}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
