import { ScrollView, View } from 'react-native';
import { useAppStore } from '../../store/app-store';
import { colors } from '../../theme';
import { AppText } from '../ui/app-text';
import { GradientOrb } from '../ui/gradient-orb';
import { CreateApplicationForm } from './create-application-form';

/**
 * Shown once after first sign-in when the user has no applications yet
 * (requirement #11) — a focused, modern "create your first application"
 * moment instead of an empty dashboard.
 */

export function FirstRunExperience() {
  const setSelectedId = useAppStore((state) => state.setSelectedApplicationId);

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 40,
      }}
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <View style={{ alignItems: 'center', marginBottom: 8 }}>
        <GradientOrb size={190} />
      </View>

      <AppText variant="title" style={{ textAlign: 'center' }}>
        Create your first application
      </AppText>
      <AppText
        variant="muted"
        style={{ textAlign: 'center', marginTop: 10, marginBottom: 28, paddingHorizontal: 8 }}
      >
        Applications are your content ideas — each one owns its own projects,
        clips and ready-to-post videos.
      </AppText>

      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 20,
        }}
      >
        <CreateApplicationForm
          submitLabel="Create & continue"
          onCreated={(created) => setSelectedId(created.id)}
        />
      </View>
    </ScrollView>
  );
}
