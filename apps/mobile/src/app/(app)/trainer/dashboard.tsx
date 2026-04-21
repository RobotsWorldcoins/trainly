import React from 'react';
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

async function fetchTrainerDashboard(trainerId: string) {
  const now = new Date().toISOString().split('T')[0];

  const [sessionsRes, earningsRes, pendingRes] = await Promise.all([
    supabase
      .from('sessions')
      .select('id, title, date, start_time, status, current_participants, max_participants')
      .eq('trainer_id', trainerId)
      .gte('date', now)
      .order('date', { ascending: true })
      .limit(5),
    supabase
      .from('payments')
      .select('amount, trainer_amount, created_at')
      .eq('trainer_id', trainerId)
      .eq('status', 'completed'),
    supabase
      .from('session_participants')
      .select('id, sessions(title, date)')
      .eq('sessions.trainer_id', trainerId)
      .eq('status', 'confirmed')
      .gte('sessions.date', now),
  ]);

  const totalEarnings = (earningsRes.data || []).reduce((sum: number, p: any) => sum + (p.trainer_amount || 0), 0);
  const monthEarnings = (earningsRes.data || [])
    .filter((p: any) => new Date(p.created_at) > new Date(Date.now() - 30 * 86400000))
    .reduce((sum: number, p: any) => sum + (p.trainer_amount || 0), 0);

  return {
    upcomingSessions: sessionsRes.data || [],
    totalEarnings,
    monthEarnings,
    totalSessions: sessionsRes.data?.length || 0,
  };
}

export default function TrainerDashboardScreen() {
  const { user, profile } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['trainer-dashboard', user?.id],
    queryFn: () => fetchTrainerDashboard(user!.id),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Olá, {profile?.display_name?.split(' ')[0]} 👋</Text>
          <Text style={styles.headerSub}>Painel do treinador</Text>
        </View>
        <Pressable style={styles.settingsBtn} onPress={() => router.push('/(app)/(tabs)/profile')}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard
            icon="💶"
            label="Este mês"
            value={`€${((data?.monthEarnings || 0) / 100).toFixed(2)}`}
            color={Colors.success}
          />
          <StatCard
            icon="📅"
            label="Próximas sessões"
            value={String(data?.upcomingSessions.length || 0)}
            color={Colors.primary}
          />
          <StatCard
            icon="💰"
            label="Total ganho"
            value={`€${((data?.totalEarnings || 0) / 100).toFixed(2)}`}
            color={Colors.accent}
          />
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ações rápidas</Text>
          <View style={styles.actionGrid}>
            <ActionCard icon="➕" label="Nova sessão" onPress={() => router.push('/(app)/create-session')} color={Colors.primary} />
            <ActionCard icon="📋" label="As minhas sessões" onPress={() => router.push('/(app)/trainer/sessions')} color={Colors.accent} />
            <ActionCard icon="💳" label="Ganhos" onPress={() => router.push('/(app)/trainer/earnings')} color={Colors.success} />
            <ActionCard icon="⭐" label="Avaliações" onPress={() => router.push(`/(app)/trainer/${user?.id}`)} color="#8B5CF6" />
          </View>
        </View>

        {/* Upcoming sessions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Próximas sessões</Text>
            <Pressable onPress={() => router.push('/(app)/trainer/sessions')}>
              <Text style={styles.sectionLink}>Ver todas →</Text>
            </Pressable>
          </View>

          {data?.upcomingSessions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>Nenhuma sessão futura</Text>
              <Pressable style={styles.emptyBtn} onPress={() => router.push('/(app)/create-session')}>
                <Text style={styles.emptyBtnText}>Criar sessão</Text>
              </Pressable>
            </View>
          ) : (
            data?.upcomingSessions.map((s: any) => (
              <Pressable
                key={s.id}
                style={styles.sessionCard}
                onPress={() => router.push(`/(app)/session/${s.id}`)}
              >
                <View style={styles.sessionCardLeft}>
                  <Text style={styles.sessionDate}>
                    {format(new Date(s.date), "d MMM", { locale: ptBR })}
                  </Text>
                  <Text style={styles.sessionTime}>{s.start_time?.slice(0, 5)}</Text>
                </View>
                <View style={styles.sessionCardRight}>
                  <Text style={styles.sessionTitle} numberOfLines={1}>{s.title}</Text>
                  <Text style={styles.sessionParticipants}>
                    👥 {s.current_participants}/{s.max_participants} participantes
                  </Text>
                </View>
                <View style={[styles.statusBadge, s.status === 'published' ? styles.statusPublished : styles.statusDraft]}>
                  <Text style={styles.statusText}>{s.status === 'published' ? 'Pub.' : 'Rascunho'}</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>

        {/* Stripe onboarding prompt if not connected */}
        {profile && !(profile as any).stripe_connect_onboarded && (
          <View style={styles.stripePrompt}>
            <Text style={styles.stripePromptTitle}>💳 Configura os pagamentos</Text>
            <Text style={styles.stripePromptText}>
              Para receber pagamentos das sessões, conecta a tua conta Stripe.
            </Text>
            <Pressable style={styles.stripeBtn} onPress={() => router.push('/(app)/trainer/stripe-onboard')}>
              <Text style={styles.stripeBtnText}>Conectar Stripe →</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({ icon, label, onPress, color }: { icon: string; label: string; onPress: () => void; color: string }) {
  return (
    <Pressable style={[styles.actionCard, { borderColor: color + '40' }]} onPress={onPress}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
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
  headerGreeting: { fontSize: FontSize.lg, fontFamily: FontFamily.bold, color: Colors.text },
  headerSub: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.textMuted },
  settingsBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  settingsIcon: { fontSize: 22 },
  statsRow: {
    flexDirection: 'row', paddingHorizontal: Spacing[4], paddingVertical: Spacing[4], gap: Spacing[3],
  },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing[3], alignItems: 'center', gap: 4,
    ...Shadow.sm, borderTopWidth: 3,
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: FontSize.lg, fontFamily: FontFamily.extrabold },
  statLabel: { fontSize: 10, fontFamily: FontFamily.medium, color: Colors.textMuted, textAlign: 'center' },
  section: { paddingHorizontal: Spacing[5], marginBottom: Spacing[5], gap: Spacing[3] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.text },
  sectionLink: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold, color: Colors.primary },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[3] },
  actionCard: {
    width: '47%', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing[4], alignItems: 'center', gap: Spacing[2],
    borderWidth: 1.5, ...Shadow.sm,
  },
  actionIcon: { fontSize: 28 },
  actionLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold, color: Colors.text, textAlign: 'center' },
  sessionCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing[3],
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing[4], ...Shadow.sm,
  },
  sessionCardLeft: { alignItems: 'center', width: 44 },
  sessionDate: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.primary },
  sessionTime: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textMuted },
  sessionCardRight: { flex: 1, gap: 4 },
  sessionTitle: { fontSize: FontSize.base, fontFamily: FontFamily.semibold, color: Colors.text },
  sessionParticipants: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textSecondary },
  statusBadge: { paddingHorizontal: Spacing[2], paddingVertical: 4, borderRadius: BorderRadius.sm },
  statusPublished: { backgroundColor: Colors.successLight },
  statusDraft: { backgroundColor: Colors.border },
  statusText: { fontSize: 10, fontFamily: FontFamily.bold, color: Colors.success },
  emptyCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing[6], alignItems: 'center', gap: Spacing[3],
  },
  emptyEmoji: { fontSize: 44 },
  emptyText: { fontSize: FontSize.base, fontFamily: FontFamily.medium, color: Colors.textSecondary },
  emptyBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: Spacing[3], paddingHorizontal: Spacing[6] },
  emptyBtnText: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.textInverse },
  stripePrompt: {
    margin: Spacing[5], backgroundColor: '#EFF6FF',
    borderRadius: BorderRadius.xl, padding: Spacing[5], gap: Spacing[3],
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  stripePromptTitle: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: '#1E40AF' },
  stripePromptText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: '#3730A3', lineHeight: FontSize.sm * 1.5 },
  stripeBtn: { alignSelf: 'flex-start', backgroundColor: '#1E40AF', borderRadius: BorderRadius.md, paddingVertical: Spacing[2], paddingHorizontal: Spacing[4] },
  stripeBtnText: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.textInverse },
});
