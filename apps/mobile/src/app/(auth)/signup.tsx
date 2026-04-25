import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius } from '@constants/typography';
import { supabase } from '@lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignupScreen() {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [wantsToBeTrainer, setWantsToBeTrainer] = useState(false);

  const handleSignup = async () => {
    if (!displayName.trim() || !email.trim() || !password.trim()) return;
    if (password.length < 8) {
      Alert.alert(t('common.error'), 'A palavra-passe deve ter pelo menos 8 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            preferred_language: 'pt',
            wants_trainer: wantsToBeTrainer,
          },
        },
      });

      if (error) {
        Alert.alert(t('common.error'), error.message);
      } else {
        router.replace('/(auth)/onboarding');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.title}>{t('auth.create_account')}</Text>
            <Text style={styles.subtitle}>Junta-te à comunidade TrainyX</Text>
          </View>

          {/* Path choice */}
          <View style={styles.pathContainer}>
            <Pressable
              style={[styles.pathCard, !wantsToBeTrainer && styles.pathCardActive]}
              onPress={() => setWantsToBeTrainer(false)}
            >
              <Text style={styles.pathIcon}>🏃</Text>
              <Text style={[styles.pathTitle, !wantsToBeTrainer && styles.pathTitleActive]}>
                {t('onboarding.want_to_train')}
              </Text>
              <Text style={styles.pathDesc}>{t('onboarding.want_to_train_desc')}</Text>
            </Pressable>

            <Pressable
              style={[styles.pathCard, wantsToBeTrainer && styles.pathCardActive]}
              onPress={() => setWantsToBeTrainer(true)}
            >
              <Text style={styles.pathIcon}>🏋️</Text>
              <Text style={[styles.pathTitle, wantsToBeTrainer && styles.pathTitleActive]}>
                {t('onboarding.become_trainer')}
              </Text>
              <Text style={styles.pathDesc}>{t('onboarding.become_trainer_desc')}</Text>
            </Pressable>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoComplete="name"
                placeholder="O teu nome"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.email')}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="o.teu@email.com"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.password')}</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          <Pressable
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSignup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <Text style={styles.submitButtonText}>{t('auth.create_account')}</Text>
            )}
          </Pressable>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              {t('auth.terms_agree')}{' '}
              <Text style={styles.termsLink}>{t('auth.terms_link')}</Text>
              {' '}{t('auth.and')}{' '}
              <Text style={styles.termsLink}>{t('auth.privacy_link')}</Text>
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.have_account')} </Text>
            <Pressable onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.footerLink}>{t('auth.sign_in')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing[6], paddingBottom: Spacing[8] },
  backButton: { marginTop: Spacing[4], width: 40, height: 40, justifyContent: 'center' },
  backText: { fontSize: FontSize.xl, color: Colors.text },
  header: { marginTop: Spacing[6], marginBottom: Spacing[6] },
  title: { fontSize: FontSize['2xl'], fontFamily: FontFamily.extrabold, color: Colors.text, marginBottom: Spacing[1] },
  subtitle: { fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.textSecondary },
  pathContainer: { flexDirection: 'row', gap: Spacing[3], marginBottom: Spacing[6] },
  pathCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.border, padding: Spacing[4], alignItems: 'center', gap: Spacing[2],
  },
  pathCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryAlpha10 },
  pathIcon: { fontSize: 28 },
  pathTitle: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.textSecondary, textAlign: 'center' },
  pathTitleActive: { color: Colors.primary },
  pathDesc: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textMuted, textAlign: 'center' },
  form: { gap: Spacing[4], marginBottom: Spacing[6] },
  inputGroup: { gap: Spacing[2] },
  label: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold, color: Colors.text },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing[4], paddingVertical: Spacing[4],
    fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.text,
  },
  submitButton: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: Spacing[4],
    alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.textInverse },
  termsContainer: { alignItems: 'center', marginTop: Spacing[4] },
  termsText: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textMuted, textAlign: 'center' },
  termsLink: { color: Colors.primary, textDecorationLine: 'underline' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing[5] },
  footerText: { fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.textSecondary },
  footerLink: { fontSize: FontSize.base, fontFamily: FontFamily.semibold, color: Colors.primary },
});
