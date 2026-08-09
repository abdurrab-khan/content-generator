import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, radii } from '../../theme';
import { AppText } from './app-text';

/**
 * Labeled text input with focus ring, leading icon slot and error text.
 */

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  leadingIcon?: React.ReactNode;
  trailing?: React.ReactNode;
}

export function Input({ label, error, leadingIcon, trailing, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: colors.cardAlt,
          borderRadius: radii.lg,
          borderWidth: 1.5,
          borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
          paddingHorizontal: 14,
          minHeight: 50,
        }}
      >
        {leadingIcon}
        <TextInput
          placeholderTextColor={colors.textDim}
          style={{
            flex: 1,
            color: colors.text,
            fontFamily: fonts.regular,
            fontSize: 15,
            paddingVertical: 12,
          }}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />
        {trailing}
      </View>
      {error ? (
        <AppText variant="caption" style={{ color: colors.danger }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
