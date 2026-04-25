import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Colors } from '@constants/colors';
import { FontFamily } from '@constants/typography';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';

const CATEGORY_EMOJI: Record<string, string> = {
  yoga: '🧘', running: '🏃', cycling: '🚴', swimming: '🏊',
  strength: '💪', hiit: '⚡', pilates: '🌀', boxing: '🥊',
  dance: '💃', tennis: '🎾', football: '⚽', default: '🏋️',
};

const MOCK_HISTORY = [
  {
    id: 'p1', status: 'completed', xp_earned: 120, payment_status: 'paid',
    session: { id: 's1', title: 'HIIT Intensivo', category: 'hiit', starts_at: new Date(Date.now() - 86400000).toISOString(), ends_at: new Date(Date.now() - 82800000).toISOString(), location_name: 'Parque Eduardo VII', trainer: { display_name: 'Carlos Mendes' } },
  },
  {
    id: 'p2', status: 'completed', xp_earned: 80, payment_status: 'paid',
    session: { id: 's2', title: 'Yoga Matinal', category: 'yoga', starts_at: new Date(Date.now() - 3 * 86400000).toISOString(), ends_at: new Date(Date.now() - 3 * 86400000 + 3600000).toISOString(), location_name: 'Jardim da Estrela', trainer: { display_name: 'Ana Santos' } },
  },
  {
    id: 'p3', status: 'completed', xp_earned: 100, payment_status: 'paid',
    session: { id: 's3', title: 'Running 5K', category: 'running', starts_at: new Date(Date.now() - 5 * 86400000).toISOString(), ends_at: new Date(Date.now() - 5 * 86400000 + 2400000).toISOString(), location_name: 'Monsanto', trainer: { display_name: 'Pedro Costa' } },
  },
  {
    id: 'p4', status: 'no_show', xp_earned: 0, payment_status: 'paid',
    session: { id: 's4', title: 'Pilates', category: 'pilates', starts_at: new Date(Date.now() - 7 * 86400000).toISOString(), ends_at: new Date(Date.now() - 7 * 86400000 + 3600000).toISOString(), location_name: 'Jardim da Estrela', trainer: { display_name: 'Joana Lima' } },
  },
  {
    id: 'p5', status: 'completed', xp_earned: 90, payment_status: 'paid',
    session: { id: 's5', title: 'Força e Resistência', category: 'strength', starts_at: new Date(Date.now() - 10 * 86400000).toISOString(), ends_at: new Date(Date.now() - 10 * 86400000 + 3600000).toISOString(), location_name: 'Parque das Nações', trainer: { display_name: 'Miguel Ferreira' } },
  },
];

const STATUS_LABEL: Record<string, { color: string; bg: string; label: string }> = {
  completed: { color: '#10B981', bg: '#D1FAE5', label: 'Concluído' },
  no_show:   { color: '#9CA3AF', bg: '#F3F4F6', label: 'Faltou' },
  cancelled: { color: '#EF4444', bg: '#FEE2E2', label: 'Cancelado' },
};

type FilterType = 'all' | 'completed' | 'no_show';

export default function ActivityHistoryScreen() {
  const { profile } = useAuthStore();
  const [filter, setFilter] = useState<FilterType>('all');

  const { data: history = MOCK_HISTORY } = useQuery({
    queryKey: ['activity-history', profile?.id],
    queryFn: async () => {
      if (!profile) return MOCK_HISTORY;
      const { data } = await supabase
        .from('session_participants')
        .select(`
          id, status, payment_status,
          session:sessions(id, title, category, starts_at, ends_at, location_name,
            trainer:profiles!trainer_id(display_name))
        `)
        .eq('user_id', profile.user_id)
        .in('status', ['completed', 'no_show', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(60);
      if (data && data.length > 0) return data as typeof MOCK_HISTORY;
      return MOCK_HISTORY;
    },
    enabled: true,
  });

  const filtered = filter === 'all' ? history : history.filter(h => h.status === filter);

  // Group by month
  const sections = (() => {
    const map: Record<string, typeof MOCK_HISTORY> = {};
    filtered.forEach(item => {
      const key = format(parseISO(item.session.starts_at), 'MMMM yyyy', { locale: pt });
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return Object.entries(map).map(([title, data]) => ({ title, data }));
  })();

  // Totals
  const totalSessions = history.filter(h => h.status === 'completed').length;
  const totalXP = history.reduce((sum, h) => sum + (h.xp_earned ?? 0), 0);

  const renderItem = ({ item }: { item: typeof MOCK_HISTORY[0] }) => {
    const s = item.session;
    const emoji = CATEGORY_EMOJI[s.category] ?? CATEGORY_EMOJI.default;
    const status = STATUS_LABEL[item.status] ?? STATUS_LABEL.completed;
    const duration = Math.round(
      (new Date(s.ends_at).getTime() - new Date(s.starts_at).getTime()) / 60000
    );

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(app)/session/${s.id}` as any)}
        activeOpacity={0.8}
      >
        <View style={styles.cardLeft}>
          <View style={styles.emojiWrap}>
            <Text style={styles.cardEmoji}>{emoji}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{s.title}</Text>
          <Text style={styles.cardMeta}>📍 {s.location_name}</Text>
          <Text style={styles.cardMeta}>👤 {s.trainer?.display_name ?? 'Grupo social'}</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.cardDate}>
              {format(parseISO(s.starts_at), 'd MMM · HH:mm', { locale: pt })}
            </Text>
            <Text style={styles.cardDuration}>{duration} min</Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          {item.xp_earned > 0 && (
            <Text style={styles.xpText}>+{item.xp_earned} XP</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Histórico</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalSessions}</Text>
          <Text style={styles.summaryLabel}>Sessões</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Colors.xpGold }]}>{totalXP}</Text>
          <Text style={styles.summaryLabel}>XP Total</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {history.filter(h => h.status === 'completed').length}
          </Text>
          <Text style={styles.summaryLabel}>Este mês</Text>
        </View>
      </View>

      {/* Filter chips */}
      <View style={styles.filters}>
        {(['all', 'completed', 'no_show'] as FilterType[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Todos' : f === 'completed' ? 'Concluídos' : 'Faltas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>Sem histórico</Text>
            <Text style={styles.emptySub}>As tuas sessões concluídas aparecerão aqui.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 20, color: Colors.text },
  headerTitle: { fontSize: 20, fontFamily: FontFamily.bold, color: Colors.text },

  summary: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontFamily: FontFamily.bold, color: Colors.text },
  summaryLabel: { fontSize: 11, fontFamily: FontFamily.regular, color: Colors.textMuted, marginTop: 2 },
  summaryDivider: { width: 1, height: 36, backgroundColor: Colors.border },

  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, fontFamily: FontFamily.medium, color: Colors.textMuted },
  filterTextActive: { color: '#fff' },

  list: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionHeader: { marginTop: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontFamily: FontFamily.semibold, color: Colors.textMuted, textTransform: 'capitalize' },

  card: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 16, padding: 14, marginBottom: 10, gap: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardLeft: { justifyContent: 'center' },
  emojiWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  cardEmoji: { fontSize: 26 },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 14, fontFamily: FontFamily.semibold, color: Colors.text },
  cardMeta: { fontSize: 11, fontFamily: FontFamily.regular, color: Colors.textMuted },
  cardFooter: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cardDate: { fontSize: 11, fontFamily: FontFamily.medium, color: Colors.textSecondary },
  cardDuration: { fontSize: 11, fontFamily: FontFamily.regular, color: Colors.textMuted },
  cardRight: { alignItems: 'flex-end', gap: 6, justifyContent: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: FontFamily.semibold },
  xpText: { fontSize: 12, fontFamily: FontFamily.bold, color: Colors.xpGold },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontFamily: FontFamily.semibold, color: Colors.text, marginBottom: 6 },
  emptySub: { fontSize: 14, fontFamily: FontFamily.regular, color: Colors.textMuted, textAlign: 'center' },
});
