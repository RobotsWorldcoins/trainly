import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@lib/supabase';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius } from '@constants/typography';

export default function StripeOnboardScreen() {
  const { success, refresh } = useLocalSearchParams<{ success?: string; refresh?: string }>();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'success' | 'refresh'>('idle');

  useEffect(() => {
    if (success === 'true') {
      setPhase('success');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } else if (refresh === 'true') {
      setPhase('refresh');
    }
  }, [success, refresh]);

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/trainer-connect-onboard`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.onboarded) {
        setPhase('success');
        return;
      }

      await Linking.openURL(data.url);
    } catch (err: any) {
      console.error('Stripe onboard error:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (phase === 'success') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>Conta Stripe conectada!</Text>
          <Text style={styles.subtitle}>Podes agora receber pagamentos pelas tuas sessões.</Text>
          <Pressable style={styles.btn} onPress={() => router.replace('/(app)/trainer/dashboard')}>
            <Text style={styles.btnText}>Ir para o painel</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Configurar pagamentos</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.centered}>
        <Text style={styles.emoji}>💳</Text>
        <Text style={styles.title}>Conecta a tua conta Stripe</Text>
        <Text style={styles.subtitle}>
          Para receberes os pagamentos das tuas sessões, precisas de criar ou conectar uma conta Stripe Express.
          {'\n\n'}
          O processo é rápido e seguro. Precisarás de:
        </Text>

        <View style={styles.list}>
          {['📋 NIF / número de identificação', '🏦 IBAN para transferências', '🪪 Documento de identidade', '📱 Número de telemóvel'].map(item => (
            <View key={item} style={styles.listItem}>
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>

        {phase === 'refresh' && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚠️ O processo de verificação não foi concluído. Tenta novamente.
            </Text>
          </View>
        )}

        <Pressable
          style={[styles.btn, isLoading && styles.btnDisabled]}
          onPress={handleStart}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <Text style={styles.btnText}>Iniciar configuração →</Text>
          )}
        </Pressable>

        <Text style={styles.disclaimer}>
          Processado por Stripe. Os teus dados financeiros nunca passam pelos servidores da TrainyX.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing[5], paddingVertical: Spacing[4],
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: FontSize.xl, color: Colors.text },
  headerTitle: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.text },
  centered: { flex: 1, padding: Spacing[6], alignItems: 'center', justifyContent: 'center', gap: Spacing[4] },
  emoji: { fontSize: 64 },
  title: { fontSize: FontSize.xl, fontFamily: FontFamily.extrabold, color: Colors.text, textAlign: 'center' },
  subtitle: { fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.textSecondary, textAlign: 'center', lineHeight: FontSize.base * 1.6 },
  list: { alignSelf: 'stretch', gap: Spacing[2] },
  listItem: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[3],
    borderWidth: 1, borderColor: Colors.border,
  },
  listText: { fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.text },
  warningBanner: { backgroundColor: Colors.warningLight, borderRadius: BorderRadius.md, padding: Spacing[4], alignSelf: 'stretch' },
  warningText: { fontSize: FontSize.sm, fontFamily: FontFamily.medium, color: Colors.warning, textAlign: 'center' },
  btn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[4], paddingHorizontal: Spacing[8], alignSelf: 'stretch', alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.textInverse },
  disclaimer: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textMuted, textAlign: 'center' },
});
