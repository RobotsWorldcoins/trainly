import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, TextInputProps, ViewStyle } from 'react-native';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius } from '@constants/typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
}

export function Input({
  label, error, hint, leftIcon, rightIcon, onRightIconPress,
  containerStyle, isPassword = false, ...props
}: InputProps) {
  const [secureText, setSecureText] = useState(isPassword);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.inputWrapper, !!error && styles.inputWrapperError]}>
        {leftIcon && <Text style={styles.leftIcon}>{leftIcon}</Text>}

        <TextInput
          style={[styles.input, leftIcon && styles.inputWithLeft, (rightIcon || isPassword) && styles.inputWithRight]}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={secureText}
          {...props}
        />

        {isPassword && (
          <Pressable onPress={() => setSecureText(!secureText)} style={styles.rightBtn}>
            <Text style={styles.rightIcon}>{secureText ? '👁' : '🙈'}</Text>
          </Pressable>
        )}

        {rightIcon && !isPassword && (
          <Pressable onPress={onRightIconPress} style={styles.rightBtn}>
            <Text style={styles.rightIcon}>{rightIcon}</Text>
          </Pressable>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing[1] },
  label: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold, color: Colors.text },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  inputWrapperError: { borderColor: Colors.error },
  leftIcon: { fontSize: 18, paddingLeft: Spacing[4] },
  input: {
    flex: 1, fontSize: FontSize.base, fontFamily: FontFamily.regular,
    color: Colors.text, paddingVertical: Spacing[3], paddingHorizontal: Spacing[4],
  },
  inputWithLeft: { paddingLeft: Spacing[2] },
  inputWithRight: { paddingRight: Spacing[2] },
  rightBtn: { paddingRight: Spacing[4], paddingLeft: Spacing[2] },
  rightIcon: { fontSize: 18 },
  error: { fontSize: FontSize.xs, fontFamily: FontFamily.medium, color: Colors.error },
  hint: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textMuted },
});
