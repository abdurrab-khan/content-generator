import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/app-store';
import { colors, gradients, radii } from '../../theme';
import type { Application } from '../../api/types';
import { AppText } from '../ui/app-text';
import { Sheet } from '../ui/sheet';
import { CreateApplicationForm } from './create-application-form';

/**
 * Header pill that shows the active application and opens a bottom sheet to
 * switch between applications or create a new one (requirement #11).
 */

export interface ApplicationSwitcherProps {
  applications: Application[];
  selected: Application;
}

export function ApplicationSwitcher({ applications, selected }: ApplicationSwitcherProps) {
  const setSelectedId = useAppStore((state) => state.setSelectedApplicationId);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'list' | 'create'>('list');

  const close = () => {
    setOpen(false);
    setMode('list');
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Current application: ${selected.name}. Tap to switch.`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          borderRadius: radii.full,
          paddingLeft: 6,
          paddingRight: 12,
          paddingVertical: 5,
          opacity: pressed ? 0.8 : 1,
          alignSelf: 'flex-start',
          maxWidth: '100%',
        })}
      >
        <LinearGradient
          colors={[...gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 26,
            height: 26,
            borderRadius: radii.full,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="apps" size={13} color="#fff" />
        </LinearGradient>
        <AppText variant="label" style={{ color: colors.text, flexShrink: 1 }} numberOfLines={1}>
          {selected.name}
        </AppText>
        <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
      </Pressable>

      <Sheet
        visible={open}
        onClose={close}
        title={mode === 'list' ? 'Switch application' : 'New application'}
      >
        {mode === 'list' ? (
          <ApplicationList
            applications={applications}
            selected={selected}
            onSelect={(id) => {
              setSelectedId(id);
              close();
            }}
            onCreateNew={() => setMode('create')}
          />
        ) : (
          <CreateApplicationForm
            onCreated={(created) => {
              setSelectedId(created.id);
              close();
            }}
          />
        )}
      </Sheet>
    </>
  );
}

interface ApplicationListProps {
  applications: Application[];
  selected: Application;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}

function ApplicationList({ applications, selected, onSelect, onCreateNew }: ApplicationListProps) {
  return (
    <View style={{ gap: 6 }}>
      <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 6 }}>
          {applications.map((app) => {
            const isActive = app.id === selected.id;
            return (
              <Pressable
                key={app.id}
                accessibilityRole="button"
                onPress={() => onSelect(app.id)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: isActive ? colors.primary : colors.border,
                  backgroundColor: isActive
                    ? 'rgba(139,92,246,0.12)'
                    : pressed
                      ? colors.cardAlt
                      : 'transparent',
                })}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: radii.md,
                    backgroundColor: isActive ? colors.primary : colors.cardAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText variant="subheading" style={{ color: '#fff', fontSize: 15 }}>
                    {app.name.slice(0, 1).toUpperCase()}
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="label" style={{ color: colors.text }} numberOfLines={1}>
                    {app.name}
                  </AppText>
                  {app.description ? (
                    <AppText variant="caption" numberOfLines={1}>
                      {app.description}
                    </AppText>
                  ) : null}
                </View>
                {isActive ? (
                  <Ionicons name="checkmark-circle" size={18} color={colors.primaryBright} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        onPress={onCreateNew}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: 14,
          borderRadius: radii.lg,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: colors.borderStrong,
          opacity: pressed ? 0.7 : 1,
          marginTop: 4,
        })}
      >
        <Ionicons name="add" size={18} color={colors.primaryBright} />
        <AppText variant="label" style={{ color: colors.primaryBright }}>
          New application
        </AppText>
      </Pressable>
    </View>
  );
}
