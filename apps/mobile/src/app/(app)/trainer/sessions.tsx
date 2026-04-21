import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadow } from '@constants/typography';

type TabFilter = 'upcoming' | 'past' | 'draft';

async function fetchTrainerSessions(trainerId: string, tab: TabFilter) {
  const now = new Date().toISOString().split('T')[0];
  let query = supabase
    .from('sessions')
    .select('id, title, category, date, start_time, end_time, status, price, current_participants, max_participants')
    .eq('trainer_id', trainerId)
    .order('date', { ascending: tab !== 'past' });

  if (tab === 'upcoming') query = query.gte('date', now).neq('status', 'draft');
  else if (tab === 'past') query = query.lt('date', now);
  else query = query.eq('status', 'draft');

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export default function TrainerSessionsScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabFilter>('upcoming');

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['trainer-sessions', user?.id, tab],
    queryFn: () => fetchTrainerSessions(user!.id, tab),
    enabled: !!user,
  });

  const handleCancel = (sessionId: string, title: string) => {
    Alert.alert(
      'Cancelar sessão',
      `Tens a certeza que queres cancelar "${title}"? Os participantes serão reembolsados.`,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Cancelar sessão',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('sessions').update({ status: 'cancelled' }).eq('id', sessionId);
            if (error) { Alert.alert('Erro', error.message); return; }
            queryClient.invalidateQueries({ queryKey: ['trainer-sessions'] });
          },
        },
      ]
    );
  };

  const handlePublish = async (sessionId: string) => {
    const { error } = await supabase.from('sessions').update({ status: 'published' }).eq('id', sessionId);
    if (error) { Alert.alert('Erro', error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['trainer-sessions'] });
  };

  const TABS: { key: TabFilter; label: string }[] = [
    { key: 'upcoming', label: 'Próximas' },
    { key: 'past', label: 'Passadas' },
    { key: 'draft', label: 'Rascunhos' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>As minhas sessões</Text>
        <Pressable style={styles.addBtn} onPress={() => router.push('/(app)/create-session')}>
          <Text style={styles.addBtnText}>+ Nova</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(t => (
          <Pressable
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : sessions?.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyText}>Nenhuma sessão aqui</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/(app)/session/${item.id}`)}>
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.cardMeta}>
                    {format(new Date(item.date), "d MMM yyyy", { locale: ptBR })} · {item.start_time?.slice(0, 5)}
                  </Text>
                  <Text style={styles.cardParticipants}>
                    👥 {item.current_participants}/{item.max_participants} · {item.price === 0 ? 'Grátis' : `€${item.price?.toFixed(2)}`}
                  </Text>
                </View>
                <View style={[styles.statusPill, getStatusStyle(item.status)]}>
                  <Text style={styles.statusPillText}>{getStatusLabel(item.status)}</Text>
                </View>
              </View>

              {tab !== 'past' && (
                <View style={styles.cardActions}>
                  {item.status === 'draft' && (
                    <Pressable style={styles.actionBtn} onPress={() => handlePublish(item.id)}>
                      <Text style={styles.actionBtnText}>Publicar</Text>
                    </Pressable>
                  )}
                  {item.status === 'published' && (
                    <Pressable
                      style={[styles.actionBtn, styles.actionBtnDanger]}
                      onPress={() => handleCancel(item.id, item.title)}
                    >
                      <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>Cancelar</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'published': return { backgroundColor: '#DCFCE7' };
    case 'draft': return { backgroundColor: '#F3F4F6' };
    case 'cancelled': return { backgroundColor: '#FEE2E2' };
    case 'completed': return { backgroundColor: '#EFF6FF' };
    default: return {};
  }
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    published: 'Publicada', draft: 'Rascunho',
    cancelled: 'Cancelada', completed: 'Concluída',
    in_progress: 'Em curso',
  };
  return map[status] || status;
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
  addBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingHorizontal: Spacing[3], paddingVertical: Spacing[2] },
  addBtnText: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.textInverse },
  tabs: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: Spacing[3], alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: FontSize.sm, fontFamily: FontFamily.medium, color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary, fontFamily: FontFamily.bold },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing[3] },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: FontSize.base, fontFamily: FontFamily.medium, color: Colors.textSecondary },
  list: { padding: Spacing[4], gap: Spacing[3] },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing[4], ...Shadow.sm, gap: Spacing[3],
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[3] },
  cardInfo: { flex: 1, gap: 4 },
  cardTitle: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.text },
  cardMeta: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.textSecondary },
  cardParticipants: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.textMuted },
  statusPill: { paddingHorizontal: Spacing[2], paddingVertical: 4, borderRadius: BorderRadius.sm },
  statusPillText: { fontSize: 11, fontFamily: FontFamily.bold, color: Colors.text },
  cardActions: { flexDirection: 'row', gap: Spacing[2], borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing[2] },
  actionBtn: {
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[2],
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.primary,
  },
  actionBtnDanger: { borderColor: Colors.error },
  actionBtnText: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold, color: Colors.primary },
  actionBtnTextDanger: { color: Colors.error },
});
