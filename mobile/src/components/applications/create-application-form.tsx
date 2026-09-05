import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiError } from '../../api/http';
import type { Application, PodcastLanguage } from '../../api/types';
import { useCreateApplication } from '../../queries/use-applications';
import { colors, radii } from '../../theme';
import { AppText } from '../ui/app-text';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

/** Languages the discovery podcaster catalog supports. */
const LANGUAGES: { value: PodcastLanguage; label: string; hint: string }[] = [
  { value: 'ENGLISH', label: 'English', hint: 'Joe Rogan, Diary of a CEO, …' },
  { value: 'HINDI', label: 'Hindi', hint: 'Raj Shamani, Nikhil Kamath, …' },
];

/**
 * "New application" form — used by the first-run experience and the
 * application switcher sheet.
 */

export interface CreateApplicationFormProps {
  submitLabel?: string;
  onCreated: (application: Application) => void;
}

export function CreateApplicationForm({ submitLabel = 'Create application', onCreated }: CreateApplicationFormProps) {
  const createApplication = useCreateApplication();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<PodcastLanguage>('ENGLISH');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) {
      setError('Give your application a name.');
      return;
    }
    setError(null);
    try {
      const created = await createApplication.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        language,
      });
      onCreated(created);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not create the application.');
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <Input
        label="Name"
        placeholder="e.g. podcast-clips"
        autoCapitalize="none"
        value={name}
        onChangeText={setName}
        leadingIcon={<Ionicons name="apps-outline" size={17} color={colors.textDim} />}
      />
      <View style={{ gap: 8 }}>
        <AppText variant="label">Podcast language</AppText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {LANGUAGES.map((option) => {
            const isActive = option.value === language;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => setLanguage(option.value)}
                style={{
                  flex: 1,
                  gap: 2,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: radii.lg,
                  borderWidth: 1.5,
                  borderColor: isActive ? colors.primary : colors.border,
                  backgroundColor: isActive
                    ? 'rgba(139,92,246,0.12)'
                    : colors.card,
                }}
              >
                <AppText
                  variant="label"
                  style={{ color: isActive ? colors.text : colors.textMuted }}
                >
                  {option.label}
                </AppText>
                <AppText variant="caption" numberOfLines={1}>
                  {option.hint}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Input
        label="Description (optional)"
        placeholder="What kind of content does it produce?"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
        style={{ minHeight: 76, textAlignVertical: 'top' }}
      />
      {error ? (
        <AppText variant="caption" style={{ color: colors.danger }}>
          {error}
        </AppText>
      ) : null}
      <Button
        label={submitLabel}
        onPress={() => void submit()}
        loading={createApplication.isPending}
        fullWidth
        size="lg"
      />
    </View>
  );
}
