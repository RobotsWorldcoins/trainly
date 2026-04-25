import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Alert, Switch, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { Colors } from '@constants/colors';
import { FontFamily } from '@constants/typography';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Pricing ───────────────────────────────────────────────────────────────
const PLANS = {
  user_plus: {
    id: 'user_plus',
    emoji: '⭐',
    name: 'User Plus',
    tagline: 'Para utilizadores ativos',
    monthly:  { price: 4.99,  label: '€4,99', period: '/mês',  saving: null, stripeKey: 'price_user_plus_monthly' },
    annual:   { price: 39.99, label: '€39,99', period: '/ano', saving: '33%', stripeKey: 'price_user_plus_annual' },
    color: '#F5A623',
    accent: '#FFF3DC',
    features: [
      '✓  Criar grupos de atividade social',
      '✓  Acesso a sessões exclusivas',
      '✓  Prioridade nas reservas',
      '✓  Perfil verificado no mapa',
      '✓  Histórico ilimitado de sessões',
      '✓  Insígnias e XP bónus',
    ],
  },
  trainer: {
    id: 'trainer',
    emoji: '🏋️',
    name: 'Trainer',
    tagline: 'Até 15 clientes ativos',
    monthly:  { price: 19,   label: '€19',   period: '/mês', saving: null, stripeKey: 'price_trainer_monthly' },
    annual:   { price: 159,  label: '€159',  period: '/ano', saving: '30%', stripeKey: 'price_trainer_annual' },
    color: '#1B6FEB',
    accent: '#EFF6FF',
    featured: true,
    features: [
      '✓  Criar sessões pagas ilimitadas',
      '✓  Receber pagamentos via Stripe',
      '✓  Painel de treinador completo',
      '✓  Programa de treino p/ clientes',
      '✓  Entrega automática de programas',
      '✓  Métricas e progresso dos clientes',
      '✓  Mensagens in-app com clientes',
      '✓  Integração Apple Health / Garmin',
      '✓  Sessões em destaque no mapa',
    ],
  },
  coach_pro: {
    id: 'coach_pro',
    emoji: '🚀',
    name: 'Coach Pro',
    tagline: 'Clientes ilimitados + IA',
    monthly:  { price: 39,   label: '€39',   period: '/mês', saving: null, stripeKey: 'price_coach_pro_monthly' },
    annual:   { price: 319,  label: '€319',  period: '/ano', saving: '32%', stripeKey: 'price_coach_pro_annual' },
    color: '#7C3AED',
    accent: '#F5F3FF',
    features: [
      '✓  Tudo do plano Trainer',
      '✓  Clientes ilimitados',
      '✓  AI Workout Builder',
      '✓  Tracking nutrição e hábitos',
      '✓  Analytics avançados de receita',
      '✓  Check-in automático via GPS',
      '✓  Badge Coach Pro no perfil',
      '✓  Perfil destacado no mapa',
      '✓  Suporte prioritário 24/7',
      '✓  White-label (marca própria)',
    ],
  },
} as const;

type PlanKey = keyof typeof PLANS;

// ─── API call ──────────────────────────────────────────────────────────────
async function startCheckout(priceKey: string, accessToken: string, billing: 'monthly' | 'annual') {
  const res = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-subscription`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ priceKey, billing }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Erro ao criar subscrição');
  return data as { clientSecret: string; subscriptionId: string };
}

// ─── Screen ────────────────────────────────────────────────────────────────
export default function PlansScreen() {
  const { profile, hasUserPlus } = useAuthStore();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState<PlanKey | null>(null);

  const isActive = (planId: PlanKey) => {
    if (planId === 'user_plus') return hasUserPlus();
    if (planId === 'trainer') return profile?.role === 'trainer' || profile?.role === 'coach_pro';
    if (planId === 'coach_pro') return profile?.role === 'coach_pro';
    return false;
  };

  const handleSubscribe = async (planKey: PlanKey) => {
    setLoading(planKey);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const tier = PLANS[planKey];
      const billing = annual ? 'annual' : 'monthly';
      const priceKey = tier[billing].stripeKey;

      const { clientSecret } = await startCheckout(priceKey, session.access_token, billing);

      const { error: initErr } = await initPaymentSheet({
        merchantDisplayName: 'TrainyX',
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: { name: profile?.display_name ?? '' },
        appearance: {
          colors: { primary: tier.color, background: '#0A0F1E', componentBackground: '#141928', primaryText: '#FFFFFF', secondaryText: 'rgba(255,255,255,0.6)', componentText: '#FFFFFF', placeholderText: 'rgba(255,255,255,0.4)' },
        },
      });
      if (initErr) throw new Error(initErr.message);

      const { error: payErr } = await presentPaymentSheet();
      if (payErr) {
        if (payErr.code !== 'Canceled') Alert.alert('Erro no pagamento', payErr.message);
        return;
      }

      Alert.alert('🎉 Plano ativado!', `O teu plano ${tier.name} ${billing === 'annual' ? 'anual' : 'mensal'} foi ativado. Aproveita!`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Erro', err.message ?? 'Não foi possível processar o pagamento.');
    } finally {
      setLoading(null);
    }
  };

  const handleTrainerCTA = (planKey: PlanKey) => {
    const role = profile?.role;
    if (planKey === 'trainer' && (role === 'user_free' || role === 'user_plus')) {
      router.push('/(app)/trainer/apply');
    } else {
      handleSubscribe(planKey);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Planos</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <Text style={styles.heroTitle}>Escolhe o teu plano</Text>
        <Text style={styles.heroSub}>Cancela quando quiseres. Sem contratos.</Text>

        {/* Billing toggle */}
        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, !annual && styles.toggleLabelActive]}>Mensal</Text>
          <Switch
            value={annual}
            onValueChange={setAnnual}
            trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#1B6FEB' }}
            thumbColor="#FFFFFF"
            style={{ marginHorizontal: 10 }}
          />
          <Text style={[styles.toggleLabel, annual && styles.toggleLabelActive]}>
            Anual{' '}
            <Text style={styles.toggleSaving}>POUPA ATÉ 33%</Text>
          </Text>
        </View>

        {/* Plan cards */}
        {(Object.keys(PLANS) as PlanKey[]).map(key => {
          const plan = PLANS[key];
          const tier = annual ? plan.annual : plan.monthly;
          const active = isActive(key);

          return (
            <View
              key={key}
              style={[
                styles.planCard,
                plan.featured && styles.planCardFeatured,
                { borderColor: plan.color + '40' },
              ]}
            >
              {/* Popular badge */}
              {plan.featured && (
                <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                  <Text style={styles.popularText}>MAIS POPULAR</Text>
                </View>
              )}

              {/* Plan header */}
              <View style={styles.planTop}>
                <View style={[styles.planIconBg, { backgroundColor: plan.color + '20' }]}>
                  <Text style={styles.planEmoji}>{plan.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planTagline}>{plan.tagline}</Text>
                </View>
                <View style={styles.priceBox}>
                  {annual && tier.saving && (
                    <View style={[styles.savingChip, { backgroundColor: plan.color + '20' }]}>
                      <Text style={[styles.savingText, { color: plan.color }]}>-{tier.saving}</Text>
                    </View>
                  )}
                  <Text style={[styles.priceVal, { color: plan.color }]}>{tier.label}</Text>
                  <Text style={styles.pricePeriod}>{tier.period}</Text>
                </View>
              </View>

              {/* Annual equivalent */}
              {annual && (
                <Text style={styles.perMonthNote}>
                  ≈ €{(plan.annual.price / 12).toFixed(2)}/mês · faturado anualmente
                </Text>
              )}

              {/* Features */}
              <View style={styles.featureList}>
                {plan.features.map(f => (
                  <View key={f} style={styles.featureRow}>
                    <Text style={[styles.featureDot, { color: plan.color }]}>✓</Text>
                    <Text style={styles.featureText}>{f.replace('✓  ', '')}</Text>
                  </View>
                ))}
              </View>

              {/* CTA */}
              {active ? (
                <View style={[styles.activePill, { backgroundColor: plan.color + '15', borderColor: plan.color + '40' }]}>
                  <Text style={[styles.activeText, { color: plan.color }]}>✓ Plano ativo</Text>
                </View>
              ) : (
                <Pressable
                  style={[styles.ctaBtn, { backgroundColor: plan.color }, loading === key && styles.ctaBtnDisabled]}
                  onPress={() => handleTrainerCTA(key)}
                  disabled={!!loading}
                >
                  {loading === key ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.ctaText}>
                      {key === 'trainer' && (profile?.role === 'user_free' || profile?.role === 'user_plus')
                        ? 'Candidatar-me a Trainer'
                        : `Ativar ${plan.name}`}
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          );
        })}

        {/* Comparison footnote */}
        <View style={styles.compareBox}>
          <Text style={styles.compareTitle}>Incluído em todos os planos</Text>
          {['Perfil verificado no mapa', 'Histórico de sessões', 'Sistema de XP e níveis', 'Suporte via chat', 'App iOS e Android'].map(f => (
            <View key={f} style={styles.compareRow}>
              <Text style={styles.compareCheck}>✓</Text>
              <Text style={styles.compareText}>{f}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.disclaimer}>
          🔒 Pagamentos seguros via Stripe · Cancela a qualquer momento sem custos · Preços incluem IVA
        </Text>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 20, color: '#FFFFFF' },
  headerTitle: { fontSize: 18, fontFamily: FontFamily.bold, color: '#FFFFFF' },

  scroll: { padding: 18, gap: 16 },

  heroTitle: { fontSize: 26, fontFamily: FontFamily.bold, color: '#FFFFFF', textAlign: 'center' },
  heroSub: { fontSize: 13, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 4 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#141928', borderRadius: 20, padding: 14, marginVertical: 4 },
  toggleLabel: { fontSize: 14, fontFamily: FontFamily.medium, color: 'rgba(255,255,255,0.4)' },
  toggleLabelActive: { color: '#FFFFFF', fontFamily: FontFamily.bold },
  toggleSaving: { fontSize: 10, fontFamily: FontFamily.bold, color: '#30D158' },

  planCard: {
    backgroundColor: '#141928',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    gap: 14,
    marginTop: 4,
  },
  planCardFeatured: {
    borderWidth: 2,
    shadowColor: '#1B6FEB',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    zIndex: 1,
  },
  popularText: { fontSize: 10, fontFamily: FontFamily.bold, color: '#FFFFFF', letterSpacing: 0.5 },

  planTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planIconBg: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  planEmoji: { fontSize: 26 },
  planName: { fontSize: 18, fontFamily: FontFamily.bold, color: '#FFFFFF' },
  planTagline: { fontSize: 12, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.45)', marginTop: 2 },

  priceBox: { alignItems: 'flex-end', gap: 2 },
  savingChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  savingText: { fontSize: 11, fontFamily: FontFamily.bold },
  priceVal: { fontSize: 22, fontFamily: FontFamily.bold },
  pricePeriod: { fontSize: 11, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.4)' },

  perMonthNote: { fontSize: 11, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },

  featureList: { gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', paddingTop: 14 },
  featureRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  featureDot: { fontSize: 13, fontFamily: FontFamily.bold, marginTop: 1 },
  featureText: { flex: 1, fontSize: 13, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.75)', lineHeight: 19 },

  ctaBtn: { borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  ctaBtnDisabled: { opacity: 0.5 },
  ctaText: { fontSize: 15, fontFamily: FontFamily.bold, color: '#FFFFFF' },

  activePill: { borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  activeText: { fontSize: 14, fontFamily: FontFamily.bold },

  compareBox: {
    backgroundColor: '#141928',
    borderRadius: 20,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  compareTitle: { fontSize: 13, fontFamily: FontFamily.bold, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 4 },
  compareRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  compareCheck: { fontSize: 13, color: '#30D158', fontFamily: FontFamily.bold },
  compareText: { fontSize: 13, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.6)' },

  disclaimer: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    lineHeight: 16,
  },
});
