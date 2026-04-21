import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius } from '@constants/typography';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  label, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, fullWidth = true,
  style, textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={[
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' || variant === 'secondary' ? Colors.primary : Colors.textInverse} />
      ) : (
        <Text style={[styles.label, sizeTextStyles[size], variantTextStyles[variant], textStyle]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: BorderRadius.lg, flexDirection: 'row',
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.45 },
  label: { fontFamily: FontFamily.bold },
});

const sizeStyles: Record<Size, ViewStyle> = {
  sm: { paddingVertical: Spacing[2], paddingHorizontal: Spacing[4] },
  md: { paddingVertical: Spacing[3], paddingHorizontal: Spacing[5] },
  lg: { paddingVertical: Spacing[4], paddingHorizontal: Spacing[6] },
};

const sizeTextStyles: Record<Size, TextStyle> = {
  sm: { fontSize: FontSize.sm },
  md: { fontSize: FontSize.base },
  lg: { fontSize: FontSize.md },
};

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.primaryLight, borderWidth: 1.5, borderColor: Colors.primary },
  ghost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.border },
  danger: { backgroundColor: Colors.error },
  success: { backgroundColor: Colors.success },
};

const variantTextStyles: Record<Variant, TextStyle> = {
  primary: { color: Colors.textInverse },
  secondary: { color: Colors.primary },
  ghost: { color: Colors.text },
  danger: { color: Colors.textInverse },
  success: { color: Colors.textInverse },
};
