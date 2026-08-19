import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Project } from '../../api/types';
import { colors } from '../../theme';
import { AppText } from '../ui/app-text';
import { GradientOrb } from '../ui/gradient-orb';
import { YoutubeUrlInput } from './youtube-url-input';

/**
 * Centered hero shown when the selected application has no projects yet
 * (requirement #5) — orb, headline, big input and a 3-step explainer.
 */

const STEPS = [
  { icon: 'link-outline' as const, label: 'Paste a link' },
  { icon: 'sparkles-outline' as const, label: 'AI finds moments' },
  { icon: 'download-outline' as const, label: 'Get viral clips' },
];

export interface NoProjectsHeroProps {
  applicationId: string | null;
  onCreated: (project: Project) => void;
}

export function NoProjectsHero({ applicationId, onCreated }: NoProjectsHeroProps) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 32 }}>
      <GradientOrb size={200} />

      <AppText variant="title" style={{ textAlign: 'center', marginTop: 20 }}>
        Turn podcasts into{'\n'}viral clips
      </AppText>
      <AppText
        variant="muted"
        style={{ textAlign: 'center', marginTop: 10, marginBottom: 26, paddingHorizontal: 12 }}
      >
        Drop a YouTube podcast link — the AI finds the moments
        worth posting and cuts them for you.
      </AppText>

      <View style={{ width: '100%', paddingHorizontal: 4 }}>
        <YoutubeUrlInput variant="hero" applicationId={applicationId} onCreated={onCreated} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 34,
          gap: 10,
        }}
      >
        {STEPS.map((step, index) => (
          <View key={step.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ alignItems: 'center', gap: 6, width: 86 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={step.icon} size={19} color={colors.primaryBright} />
              </View>
              <AppText variant="caption" style={{ textAlign: 'center' }}>
                {step.label}
              </AppText>
            </View>
            {index < STEPS.length - 1 ? (
              <Ionicons name="chevron-forward" size={14} color={colors.textDim} />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
