import { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { ApiError } from '../../api/http';
import type { Project } from '../../api/types';
import { isValidYouTubeUrl } from '../../lib/youtube';
import { useCreateProject } from '../../queries/use-projects';
import { toast } from '../../store/toast-store';
import { colors, fonts, gradients, radii } from '../../theme';
import { AppText } from '../ui/app-text';
import { Button } from '../ui/button';

/**
 * "Paste a YouTube link → new project" input (requirement #5).
 *  - compact: slim row pinned on the home screen
 *  - hero: large centered version for the no-projects state
 */

export interface YoutubeUrlInputProps {
  variant?: 'compact' | 'hero';
  applicationId: string | null;
  onCreated?: (project: Project) => void;
}

export function YoutubeUrlInput({ variant = 'compact', applicationId, onCreated }: YoutubeUrlInputProps) {
  const createProject = useCreateProject();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const paste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setUrl(text.trim());
  };

  const submit = async () => {
    const trimmed = url.trim();
    if (!isValidYouTubeUrl(trimmed)) {
      setError('Paste a valid YouTube link (watch, shorts or live).');
      return;
    }
    setError(null);
    try {
      const project = await createProject.mutateAsync({
        url: trimmed,
        applicationId: applicationId ?? undefined,
      });
      setUrl('');
      toast.success('Project created — pipeline started');
      onCreated?.(project);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not create the project.');
    }
  };

  const busy = createProject.isPending;
  const hero = variant === 'hero';

  return (
    <View style={{ gap: 10, width: '100%' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: hero ? 'rgba(255,255,255,0.06)' : colors.card,
          borderWidth: 1.5,
          borderColor: error ? colors.danger : hero ? 'rgba(139,92,246,0.45)' : colors.border,
          borderRadius: hero ? radii.xl : radii.lg,
          paddingLeft: 14,
          paddingRight: hero ? 14 : 6,
          minHeight: hero ? 62 : 52,
        }}
      >
        <Ionicons name="logo-youtube" size={hero ? 22 : 18} color="#FF4D4D" />
        <TextInput
          placeholder="Paste a YouTube podcast link…"
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={url}
          onChangeText={(text) => {
            setUrl(text);
            if (error) setError(null);
          }}
          onSubmitEditing={() => void submit()}
          style={{
            flex: 1,
            color: colors.text,
            fontFamily: fonts.regular,
            fontSize: hero ? 16 : 14,
            paddingVertical: 12,
          }}
        />
        {url.length === 0 ? (
          <Pressable onPress={() => void paste()} hitSlop={8}>
            <AppText variant="label" style={{ color: colors.primaryBright }}>
              Paste
            </AppText>
          </Pressable>
        ) : (
          <Pressable onPress={() => setUrl('')} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={colors.textDim} />
          </Pressable>
        )}
        {!hero ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create project"
            disabled={busy}
            onPress={() => void submit()}
            style={({ pressed }) => ({ opacity: pressed || busy ? 0.7 : 1 })}
          >
            <LinearGradient
              colors={[...gradients.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 40,
                height: 40,
                borderRadius: radii.md,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              )}
            </LinearGradient>
          </Pressable>
        ) : null}
      </View>

      {hero ? (
        <Button
          label="Generate viral clips"
          onPress={() => void submit()}
          loading={busy}
          fullWidth
          size="lg"
          icon={<Ionicons name="flash" size={17} color="#fff" />}
        />
      ) : null}

      {error ? (
        <AppText variant="caption" style={{ color: colors.danger, textAlign: hero ? 'center' : 'left' }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
