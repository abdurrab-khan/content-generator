import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PipelineState } from '../../api/types';
import { PIPELINE_STAGES, pipelineStageIndex, pipelineMeta } from '../../lib/status';
import { colors, fonts } from '../../theme';
import { AppText } from '../ui/app-text';
import { CopyableText } from '../ui/copyable-text';

/**
 * Six-stage progress stepper for the project detail header. Renders a red
 * error banner (with copyable message) when the pipeline failed.
 */

export interface PipelineProgressProps {
  state: PipelineState;
  errorMessage: string | null;
}

export function PipelineProgress({ state, errorMessage }: PipelineProgressProps) {
  if (state === 'FAILED') {
    return (
      <View
        style={{
          backgroundColor: 'rgba(248,113,113,0.10)',
          borderColor: 'rgba(248,113,113,0.35)',
          borderWidth: 1,
          borderRadius: 14,
          padding: 14,
          gap: 6,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <AppText variant="label" style={{ color: colors.danger }}>
            Pipeline failed
          </AppText>
        </View>
        {errorMessage ? (
          <CopyableText value={errorMessage} copyLabel="Error copied" variant="caption" />
        ) : null}
      </View>
    );
  }

  const current = pipelineStageIndex(state);

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {PIPELINE_STAGES.map((stage, index) => {
          const done = index < current || state === 'COMPLETED';
          const isCurrent = index === current && state !== 'COMPLETED';
          return (
            <View key={stage} style={{ flexDirection: 'row', alignItems: 'center', flex: index === 0 ? 0 : 1 }}>
              {index > 0 ? (
                <View
                  style={{
                    flex: 1,
                    height: 2,
                    backgroundColor: done || isCurrent ? colors.primary : colors.border,
                  }}
                />
              ) : null}
              <View
                style={{
                  width: isCurrent ? 14 : 10,
                  height: isCurrent ? 14 : 10,
                  borderRadius: 7,
                  backgroundColor: done
                    ? colors.primary
                    : isCurrent
                      ? 'transparent'
                      : colors.cardAlt,
                  borderWidth: isCurrent ? 2 : 1,
                  borderColor: isCurrent
                    ? colors.primaryBright
                    : done
                      ? colors.primary
                      : colors.borderStrong,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText
          variant="caption"
          style={{ color: pipelineMeta[state].color, fontFamily: fonts.semibold }}
        >
          {pipelineMeta[state].label}
        </AppText>
        <AppText variant="caption">
          Step {Math.min(current + 1, PIPELINE_STAGES.length)} of {PIPELINE_STAGES.length}
        </AppText>
      </View>
    </View>
  );
}
