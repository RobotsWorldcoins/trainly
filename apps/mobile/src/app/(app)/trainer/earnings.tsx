import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadow } from '@constants/typography';

async function fetchEarnings(trainerId: string) {
  const [paymentsRes, payoutsRes] = await Promise.all([
    supabase
      .from('payments')
      .select('id, amount, trainer_amount, platform_fee, status, created_at, sessions(title, date)')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('payouts')
      .select('id, amount, status, created_at, stripe_transfer_id')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const payments = paymentsRes.data || [];
  const payouts = payoutsRes.data || [];

  const totalEarned = payments
    .filter((p: any) => p.status === 'completed')
    .reduce((sum: number, p: any) => sum + (p.trainer_amount || 0), 0);

  const totalPaidOut = payouts
    .filter((p: any) => p.status === 'completed')
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEarned = payments
    .filter((p: any) => p.status === 'completed' && new Date(p.created_at) >= startOfMonth)
    .reduce((sum: number, p: any) => sum + (p.trainer_amount || 0), 0);

  return { payments, payouts, totalEarned, totalPaidOut, monthEarned, pendingBalance: totalEarned - totalPaidOut };
}

export default function TrainerEarningsScreen() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'payments' | 'payouts'>('payments');

  const { data, isLoading } = useQuery({
    queryKey: ['trainer-earnings', user?.id],
    queryFn: () => fetchEarnings(user!.id),
    enabled: !!user,
  });

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  const fmt = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Ganhos</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Summary cards */}
        <View style={styles.summaryGrid}>
          <SummaryCard label="Este mês" value={fmt(data?.monthEarned || 0)} icon="📅" color={Colors.primary} />
          <SummaryCard label="Total ganho" value={fmt(data?.totalEarned || 0)} icon="💰" color={Colors.success} />
          <SummaryCard label="Pago out" value={fmt(data?.totalPaidOut || 0)} icon="📤" color={Colors.accent} />
          <SummaryCard label="Saldo pendente" value={fmt(data?.pendingBalance || 0)} icon="⏳" color="#8B5CF6" />
        </View>

        {/* Info about commission */}
        <View style={styles.commissionCard}>
          <Text style={styles.commissionTitle}>ℹ️ Comissão da plataforma</Text>
          <Text style={styles.commissionText}>
            TrainyX retém 10% de cada reserva (5% nos primeiros 90 dias após registo).
            Os valores mostrados já descontam a comissão.
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <Pressable style={[styles.tab, tab === 'payments' && styles.tabActive]} onPress={() => setTab('payments')}>
            <Text style={[styles.tabText, tab === 'payments' && styles.tabTextActive]}>Reservas</Text>
          </Pressable>
          <Pressable style={[styles.tab, tab === 'payouts' && styles.tabActive]} onPress={() => setTab('payouts')}>
            <Text style={[styles.tabText, tab === 'payouts' && styles.tabTextActive]}>Pagamentos</Text>
          </Pressable>
        </View>

        <View style={styles.list}>
          {tab === 'payments' && (
            data?.payments.length === 0 ? (
              <EmptyState text="Nenhuma reserva ainda" />
            ) : data?.payments.map((p: any) => (
              <View key={p.id} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{p.sessions?.title || 'Sessão'}</Text>
                  <Text style={styles.rowDate}>
                    {format(new Date(p.created_at), "d MMM yyyy", { locale: ptBR })}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.rowAmount}>{fmt(p.trainer_amount || 0)}</Text>
                  <View style={[styles.badge, getPaymentBadgeStyle(p.status)]}>
                    <Text style={styles.badgeText}>{getPaymentLabel(p.status)}</Text>
                  </View>
                </View>
              </View>
            ))
          )}

          {tab === 'payouts' && (
            data?.payouts.length === 0 ? (
              <EmptyState text="Nenhum pagamento ainda" />
            ) : data?.payouts.map((p: any) => (
              <View key={p.id} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle}>Transferência Stripe</Text>
                  <Text style={styles.rowDate}>
                    {format(new Date(p.created_at), "d MMM yyyy", { locale: ptBR })}
                  </Text>
                  {p.stripe_transfer_id && (
                    <Text style={styles.rowSub}>{p.stripe_transfer_id.slice(0, 20)}...</Text>
                  )}
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowAmount, { color: Colors.success }]}>{fmt(p.amount || 0)}</Text>
                  <View style={[styles.badge, p.status === 'completed' ? styles.badgeSuccess : styles.badgePending]}>
                    <Text style={styles.badgeText}>{p.status === 'completed' ? 'Pago' : 'Pendente'}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value, icon, color }: any) {
  return (
    <View style={[styles.summaryCard, { borderTopColor: color }]}>
      <Text style={styles.summaryIcon}>{icon}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function getPaymentBadgeStyle(status: string) {
  if (status === 'completed') return styles.badgeSuccess;
  if (status === 'failed') return styles.badgeError;
  return styles.badgePending;
}

function getPaymentLabel(status: string) {
  const map: Record<string, string> = { completed: 'Concluído', pending: 'Pendente', failed: 'Falhado', refunded: 'Reembolsado' };
  return map[status] || status;
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
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: Spacing[4], gap: Spacing[3] },
  summaryCard: {
    width: '47%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing[4], alignItems: 'center', gap: 4, ...Shadow.sm, borderTopWidth: 3,
  },
  summaryIcon: { fontSize: 24 },
  summaryValue: { fontSize: FontSize.lg, fontFamily: FontFamily.extrabold },
  summaryLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.medium, color: Colors.textMuted },
  commissionCard: {
    marginHorizontal: Spacing[4], backgroundColor: '#EFF6FF',
    borderRadius: BorderRadius.lg, padding: Spacing[4], gap: Spacing[2],
    borderWidth: 1, borderColor: '#BFDBFE', marginBottom: Spacing[2],
  },
  commissionTitle: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: '#1E40AF' },
  commissionText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: '#3730A3', lineHeight: FontSize.sm * 1.5 },
  tabs: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: Spacing[2],
  },
  tab: { flex: 1, paddingVertical: Spacing[3], alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: FontSize.sm, fontFamily: FontFamily.medium, color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary, fontFamily: FontFamily.bold },
  list: { paddingHorizontal: Spacing[4], gap: Spacing[2] },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing[4],
  },
  rowLeft: { flex: 1, gap: 2, marginRight: Spacing[3] },
  rowTitle: { fontSize: FontSize.base, fontFamily: FontFamily.semibold, color: Colors.text },
  rowDate: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.textSecondary },
  rowSub: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textMuted },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  rowAmount: { fontSize: FontSize.md, fontFamily: FontFamily.extrabold, color: Colors.text },
  badge: { paddingHorizontal: Spacing[2], paddingVertical: 2, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: 10, fontFamily: FontFamily.bold, color: Colors.text },
  badgeSuccess: { backgroundColor: '#DCFCE7' },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgeError: { backgroundColor: '#FEE2E2' },
  empty: { padding: Spacing[8], alignItems: 'center' },
  emptyText: { fontSize: FontSize.base, fontFamily: FontFamily.medium, color: Colors.textMuted },
});
