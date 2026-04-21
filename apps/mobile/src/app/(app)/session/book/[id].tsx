import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadow } from '@constants/typography';
import { supabase } from '@lib/supabase';
import { useBooking } from '@hooks/useBooking';
import { useAuthStore } from '@stores/auth.store';

async function fetchSessionForBooking(id: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id, title, category, type, price, currency, date, start_time, end_time,
      location_name, max_participants, current_participants, min_participants,
      cancellation_policy,
      trainer:profiles!trainer_id(id, display_name, avatar_url, stripe_connect_onboarded)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export default function BookSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { profile } = useAuthStore();
  const { bookSession, isProcessing } = useBooking(id);
  const [agreed, setAgreed] = useState(false);

  const { data: session, isLoading } = useQuery({
    queryKey: ['session-book', id],
    queryFn: () => fetchSessionForBooking(id),
  });

  if (isLoading || !session) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const s = session as any;
  const isFree = s.price === 0;
  const spotsLeft = s.max_participants - s.current_participants;
  const dateStr = format(new Date(s.date + 'T' + s.start_time), "EEEE, d 'de' MMMM", {
    locale: i18n.language === 'pt' ? ptBR : undefined,
  });

  const handleBook = async () => {
    if (!agreed && !isFree) {
      Alert.alert('', 'Confirma que leste e aceitas a política de cancelamento.');
      return;
    }
    try {
      const result = await bookSession({
        price: s.price,
        currency: s.currency,
        title: s.title,
        trainer_name: s.trainer?.display_name ?? '',
      });

      if (result?.cancelled) return;

      if (result?.success) {
        router.replace(`/(app)/booking-confirmed/${id}`);
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('errors.generic'));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('sessions.book_session')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Session summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryTitle}>{s.title}</Text>
              <Text style={styles.summaryMeta}>{t(`categories.${s.category}`)} · {dateStr}</Text>
              <Text style={styles.summaryTime}>
                🕐 {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
              </Text>
              <Text style={styles.summaryLocation}>📍 {s.location_name}</Text>
            </View>
            {s.trainer?.avatar_url ? (
              <Image source={{ uri: s.trainer.avatar_url }} style={styles.trainerAvatar} />
            ) : (
              <View style={styles.trainerAvatarPlaceholder}>
                <Text style={styles.trainerInitial}>{s.trainer?.display_name?.charAt(0)}</Text>
              </View>
            )}
          </View>
          <View style={styles.trainerRow}>
            <Text style={styles.trainerLabel}>{t('sessions.trainer')}: </Text>
            <Text style={styles.trainerName}>{s.trainer?.display_name}</Text>
          </View>
        </View>

        {/* Spots remaining */}
        <View style={[styles.spotsBar, spotsLeft <= 2 && styles.spotsBarUrgent]}>
          <Text style={[styles.spotsText, spotsLeft <= 2 && styles.spotsTextUrgent]}>
            {spotsLeft <= 2
              ? `⚡ Apenas ${spotsLeft} vaga${spotsLeft !== 1 ? 's' : ''} disponível!`
              : `✓ ${spotsLeft} vagas disponíveis`}
          </Text>
        </View>

        {/* Pricing breakdown */}
        <View style={styles.pricingCard}>
          <Text style={styles.pricingTitle}>{t('sessions.booking_summary')}</Text>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>1 × {s.title}</Text>
            <Text style={styles.pricingValue}>
              {isFree ? t('common.free') : `€${s.price.toFixed(2)}`}
            </Text>
          </View>
          {!isFree && (
            <>
              <View style={styles.divider} />
              <View style={styles.pricingRow}>
                <Text style={styles.totalLabel}>{t('sessions.total')}</Text>
                <Text style={styles.totalValue}>€{s.price.toFixed(2)}</Text>
              </View>
              <Text style={styles.taxNote}>IVA incluído · Processado por Stripe</Text>
            </>
          )}
        </View>

        {/* Cancellation policy */}
        <View style={styles.policyCard}>
          <Text style={styles.policyTitle}>⚠️ Política de Cancelamento</Text>
          <Text style={styles.policyText}>
            • Cancelamento até 12h antes: reembolso total{'\n'}
            • Cancelamento entre 2–12h: reembolso de 50%{'\n'}
            • Cancelamento menos de 2h: sem reembolso
          </Text>
          {s.cancellation_policy && (
            <Text style={styles.policyExtra}>{s.cancellation_policy}</Text>
          )}
        </View>

        {/* Agreement checkbox */}
        {!isFree && (
          <Pressable style={styles.agreeRow} onPress={() => setAgreed(!agreed)}>
            <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
              {agreed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.agreeText}>
              Li e aceito a política de cancelamento e os termos desta reserva.
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Bottom action */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPrice}>
          <Text style={styles.bottomPriceLabel}>{t('sessions.total')}</Text>
          <Text style={styles.bottomPriceValue}>
            {isFree ? t('common.free') : `€${s.price.toFixed(2)}`}
          </Text>
        </View>
        <Pressable
          style={[
            styles.payButton,
            (isProcessing || (!agreed && !isFree)) && styles.payButtonDisabled,
          ]}
          onPress={handleBook}
          disabled={isProcessing || (!agreed && !isFree)}
        >
          {isProcessing ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <Text style={styles.payButtonText}>
              {isFree ? t('sessions.join_group') : t('sessions.pay_now')}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing[5], paddingVertical: Spacing[4],
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: FontSize.xl, color: Colors.text },
  headerTitle: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.text },
  scroll: { padding: Spacing[5], gap: Spacing[4], paddingBottom: 120 },
  summaryCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing[5], ...Shadow.sm, gap: Spacing[3],
  },
  summaryTop: { flexDirection: 'row', gap: Spacing[3] },
  summaryInfo: { flex: 1, gap: 6 },
  summaryTitle: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.text },
  summaryMeta: { fontSize: FontSize.sm, fontFamily: FontFamily.medium, color: Colors.primary },
  summaryTime: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.textSecondary },
  summaryLocation: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.textSecondary },
  trainerAvatar: { width: 52, height: 52, borderRadius: 26 },
  trainerAvatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  trainerInitial: { fontSize: FontSize.lg, fontFamily: FontFamily.bold, color: Colors.textInverse },
  trainerRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing[3] },
  trainerLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.textSecondary },
  trainerName: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold, color: Colors.text },
  spotsBar: {
    backgroundColor: Colors.successLight, borderRadius: BorderRadius.lg,
    padding: Spacing[3], alignItems: 'center',
  },
  spotsBarUrgent: { backgroundColor: Colors.warningLight },
  spotsText: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold, color: Colors.success },
  spotsTextUrgent: { color: Colors.warning },
  pricingCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing[5], ...Shadow.sm, gap: Spacing[3],
  },
  pricingTitle: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.text },
  pricingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pricingLabel: { fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.textSecondary },
  pricingValue: { fontSize: FontSize.base, fontFamily: FontFamily.semibold, color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border },
  totalLabel: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.text },
  totalValue: { fontSize: FontSize.xl, fontFamily: FontFamily.extrabold, color: Colors.text },
  taxNote: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textMuted, textAlign: 'right' },
  policyCard: {
    backgroundColor: Colors.warningLight, borderRadius: BorderRadius.lg,
    padding: Spacing[4], gap: Spacing[2],
  },
  policyTitle: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: '#92400E' },
  policyText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: '#92400E', lineHeight: FontSize.sm * 1.7 },
  policyExtra: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: '#B45309', marginTop: Spacing[1] },
  agreeRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[3],
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing[4], borderWidth: 1.5, borderColor: Colors.border,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { fontSize: 12, color: Colors.textInverse, fontFamily: FontFamily.bold },
  agreeText: { flex: 1, fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.text, lineHeight: FontSize.sm * 1.5 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: Spacing[5], paddingTop: Spacing[4], paddingBottom: 34,
    flexDirection: 'row', alignItems: 'center', gap: Spacing[4],
  },
  bottomPrice: { flex: 1 },
  bottomPriceLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.medium, color: Colors.textMuted },
  bottomPriceValue: { fontSize: FontSize.xl, fontFamily: FontFamily.extrabold, color: Colors.text },
  payButton: {
    flex: 2, backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[4], alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  payButtonDisabled: { opacity: 0.5, shadowOpacity: 0 },
  payButtonText: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.textInverse },
});
