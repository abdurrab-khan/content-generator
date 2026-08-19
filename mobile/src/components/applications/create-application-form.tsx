import { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiError } from '../../api/http';
import type { Application } from '../../api/types';
import { useCreateApplication } from '../../queries/use-applications';
import { colors } from '../../theme';
import { AppText } from '../ui/app-text';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

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
