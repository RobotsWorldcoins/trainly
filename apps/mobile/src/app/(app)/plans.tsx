import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadow } from '@constants/typography';

async function initiateSubscription(plan: string, accessToken: string) {
  const res = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-subscription`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ plan }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao criar subscrição');
  return data;
}

const USER_PLUS_FEATURES = [
  'Criar grupos de atividade social',
  'Acesso a sessões exclusivas User Plus',
  'Prioridade nas reservas',
  'Validade de 365 dias',
];

const TRAINER_FEATURES = [
  'Criar até 2 sessões pagas por semana',
  'Receber pagamentos via Stripe',
  'Painel de treinador completo',
  'Suporte prioritário',
];

const COACH_PRO_FEATURES = [
  'Criar até 7 sessões pagas por semana',
  'Todas as funcionalidades Trainer',
  'Sessões em destaque no mapa',
  'Badge Coach Pro no perfil',
  'Analytics avançados',
];

export default function PlansScreen() {
  const { user, profile, hasUserPlus, isTrainer } = useAuthStore();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (plan: string) => {
    setLoadingPlan(plan);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const { clientSecret } = await initiateSubscription(plan, session.access_token);

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Trainly',
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: { name: profile?.display_name },
        appearance: { colors: { primary: '#1B6FEB' } },
      });

      if (initError) throw new Error(initError.message);

      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code !== 'Canceled') {
          Alert.alert('Erro', paymentError.message);
        }
        return;
      }

      Alert.alert(
        'Subscrição ativada!',
        'O teu plano foi ativado com sucesso. Aproveita!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível processar o pagamento.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Planos</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>Eleva a tua experiência</Text>
        <Text style={styles.pageSubtitle}>Escolhe o plano certo para ti</Text>

        {/* User Plus */}
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text style={styles.planEmoji}>⭐</Text>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>User Plus</Text>
              <Text style={styles.planDesc}>Para utilizadores ativos</Text>
            </View>
            <View style={styles.planPriceBox}>
              <Text style={styles.planPrice}>€4,99</Text>
              <Text style={styles.planPricePeriod}>único</Text>
            </View>
          </View>

          <View style={styles.featureList}>
            {USER_PLUS_FEATURES.map(f => (
              <View key={f} style={styles.featureRow}>
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          {hasUserPlus() ? (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>✓ Plano ativo</Text>
            </View>
          ) : (
            <Pressable
              style={[styles.planBtn, loadingPlan === 'user_plus' && styles.planBtnDisabled]}
              onPress={() => handleSubscribe('user_plus')}
              disabled={!!loadingPlan}
            >
              {loadingPlan === 'user_plus' ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <Text style={styles.planBtnText}>Ativar User Plus</Text>
              )}
            </Pressable>
          )}
        </View>

        {/* Trainer */}
        <View style={[styles.planCard, styles.planCardTrainer]}>
          <LinearGradient colors={['#1B6FEB', '#0F4FA8']} style={styles.planGradient}>
            <View style={styles.planHeader}>
              <Text style={styles.planEmoji}>🏋️</Text>
              <View style={styles.planInfo}>
                <Text style={[styles.planName, styles.planNameLight]}>Trainer</Text>
                <Text style={[styles.planDesc, styles.planDescLight]}>Para treinadores</Text>
              </View>
              <View style={styles.planPriceBox}>
                <Text style={[styles.planPrice, styles.planPriceLight]}>€19</Text>
                <Text style={[styles.planPricePeriod, styles.planPricePeriodLight]}>/mês</Text>
              </View>
            </View>

            <View style={styles.featureList}>
              {TRAINER_FEATURES.map(f => (
                <View key={f} style={styles.featureRow}>
                  <Text style={[styles.featureCheck, styles.featureCheckLight]}>✓</Text>
                  <Text style={[styles.featureText, styles.featureTextLight]}>{f}</Text>
                </View>
              ))}
            </View>

            {profile?.role === 'trainer' ? (
              <View style={[styles.activeBadge, styles.activeBadgeLight]}>
                <Text style={[styles.activeBadgeText, styles.activeBadgeTextLight]}>✓ Plano ativo</Text>
              </View>
            ) : (
              <Pressable
                style={[styles.planBtnLight, loadingPlan === 'trainer' && styles.planBtnDisabled]}
                onPress={() => {
                  if (profile?.role === 'user_free' || profile?.role === 'user_plus') {
                    router.push('/(app)/trainer/apply');
                  } else {
                    handleSubscribe('trainer');
                  }
                }}
                disabled={!!loadingPlan}
              >
                {loadingPlan === 'trainer' ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <Text style={styles.planBtnTextDark}>
                    {profile?.role === 'trainer_pending' ? 'Candidatura pendente' : 'Tornar-me treinador'}
                  </Text>
                )}
              </Pressable>
            )}
          </LinearGradient>
        </View>

        {/* Coach Pro */}
        <View style={styles.planCard}>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>MAIS POPULAR</Text>
          </View>
          <View style={styles.planHeader}>
            <Text style={styles.planEmoji}>🚀</Text>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>Coach Pro</Text>
              <Text style={styles.planDesc}>Para profissionais sérios</Text>
            </View>
            <View style={styles.planPriceBox}>
              <Text style={styles.planPrice}>€39</Text>
              <Text style={styles.planPricePeriod}>/mês</Text>
            </View>
          </View>

          <View style={styles.featureList}>
            {COACH_PRO_FEATURES.map(f => (
              <View key={f} style={styles.featureRow}>
                <Text style={[styles.featureCheck, { color: Colors.accent }]}>✓</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          {profile?.role === 'coach_pro' ? (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>✓ Plano ativo</Text>
            </View>
          ) : (
            <Pressable
              style={[styles.planBtnAccent, loadingPlan === 'coach_pro' && styles.planBtnDisabled]}
              onPress={() => handleSubscribe('coach_pro')}
              disabled={!!loadingPlan}
            >
              {loadingPlan === 'coach_pro' ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <Text style={styles.planBtnText}>Ativar Coach Pro</Text>
              )}
            </Pressable>
          )}
        </View>

        <Text style={styles.disclaimer}>
          Pagamentos seguros processados por Stripe. Cancela quando quiseres.
        </Text>
      </ScrollView>
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
  scroll: { padding: Spacing[5], gap: Spacing[4], paddingBottom: 40 },
  pageTitle: { fontSize: FontSize['2xl'], fontFamily: FontFamily.extrabold, color: Colors.text, textAlign: 'center' },
  pageSubtitle: { fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.textSecondary, textAlign: 'center', marginTop: -8 },
  planCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing[5], ...Shadow.md, gap: Spacing[4],
    borderWidth: 1, borderColor: Colors.border,
  },
  planCardTrainer: { padding: 0, overflow: 'hidden', borderWidth: 0 },
  planGradient: { padding: Spacing[5], gap: Spacing[4], borderRadius: BorderRadius.xl },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  planEmoji: { fontSize: 32 },
  planInfo: { flex: 1 },
  planName: { fontSize: FontSize.lg, fontFamily: FontFamily.bold, color: Colors.text },
  planNameLight: { color: Colors.textInverse },
  planDesc: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.textSecondary },
  planDescLight: { color: 'rgba(255,255,255,0.7)' },
  planPriceBox: { alignItems: 'flex-end' },
  planPrice: { fontSize: FontSize.xl, fontFamily: FontFamily.extrabold, color: Colors.primary },
  planPriceLight: { color: Colors.textInverse },
  planPricePeriod: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textMuted },
  planPricePeriodLight: { color: 'rgba(255,255,255,0.6)' },
  featureList: { gap: Spacing[2] },
  featureRow: { flexDirection: 'row', gap: Spacing[2], alignItems: 'flex-start' },
  featureCheck: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.primary, marginTop: 1 },
  featureCheckLight: { color: 'rgba(255,255,255,0.9)' },
  featureText: { flex: 1, fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.text },
  featureTextLight: { color: 'rgba(255,255,255,0.9)' },
  planBtn: {
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[3], alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  planBtnLight: {
    backgroundColor: Colors.textInverse, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[3], alignItems: 'center',
  },
  planBtnAccent: {
    backgroundColor: Colors.accent, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[3], alignItems: 'center',
  },
  planBtnDisabled: { opacity: 0.5 },
  planBtnText: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.primary },
  planBtnTextDark: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.primary },
  activeBadge: {
    backgroundColor: Colors.successLight, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[3], alignItems: 'center',
  },
  activeBadgeLight: { backgroundColor: 'rgba(255,255,255,0.2)' },
  activeBadgeText: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.success },
  activeBadgeTextLight: { color: Colors.textInverse },
  proBadge: {
    position: 'absolute', top: -12, right: Spacing[5],
    backgroundColor: Colors.accent, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing[3], paddingVertical: 4, zIndex: 1,
  },
  proBadgeText: { fontSize: 10, fontFamily: FontFamily.extrabold, color: Colors.textInverse, letterSpacing: 0.5 },
  disclaimer: {
    fontSize: FontSize.xs, fontFamily: FontFamily.regular,
    color: Colors.textMuted, textAlign: 'center',
  },
});
