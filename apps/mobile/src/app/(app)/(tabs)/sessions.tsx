import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius } from '@constants/typography';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { SessionCard } from '@components/sessions/SessionCard';

type Tab = 'upcoming' | 'past' | 'my';

async function fetchMySessions(userId: string, tab: Tab) {
  const today = new Date().toISOString().split('T')[0];

  if (tab === 'upcoming') {
    const { data } = await supabase
      .from('session_participants')
      .select(`
        session:sessions(
          id, title, category, type, price, location_name, location_lat, location_lng,
          date, start_time, current_participants, max_participants, status, is_boosted,
          trainer:profiles!trainer_id(display_name, avatar_url)
        ),
        status
      `)
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .gte('session.date', today)
      .order('session.date', { ascending: true });
    return (data || []).map((d: any) => d.session).filter(Boolean);
  }

  if (tab === 'past') {
    const { data } = await supabase
      .from('session_participants')
      .select(`
        session:sessions(
          id, title, category, type, price, location_name, location_lat, location_lng,
          date, start_time, current_participants, max_participants, status, is_boosted,
          trainer:profiles!trainer_id(display_name, avatar_url)
        ),
        status
      `)
      .eq('user_id', userId)
      .lt('session.date', today)
      .order('session.date', { ascending: false });
    return (data || []).map((d: any) => d.session).filter(Boolean);
  }

  return [];
}

async function fetchAllSessions() {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('sessions')
    .select(`
      id, title, category, type, price, location_name, location_lat, location_lng,
      date, start_time, current_participants, max_participants, status, is_boosted,
      trainer:profiles!trainer_id(display_name, avatar_url)
    `)
    .eq('status', 'published')
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(30);
  return data || [];
}

export default function SessionsScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');

  const { data: mySessions = [], isLoading: myLoading } = useQuery({
    queryKey: ['my-sessions', user?.id, activeTab],
    queryFn: () => fetchMySessions(user!.id, activeTab),
    enabled: !!user && (activeTab === 'upcoming' || activeTab === 'past'),
  });

  const { data: allSessions = [], isLoading: allLoading } = useQuery({
    queryKey: ['all-sessions'],
    queryFn: fetchAllSessions,
  });

  const tabs = [
    { key: 'upcoming', label: t('sessions.upcoming') },
    { key: 'past', label: t('sessions.past') },
    { key: 'my', label: t('sessions.explore') },
  ] as { key: Tab; label: string }[];

  const displaySessions = activeTab === 'my' ? allSessions : mySessions;
  const isLoading = activeTab === 'my' ? allLoading : myLoading;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('sessions.title')}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={displaySessions as any[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              onPress={() => router.push(`/(app)/session/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>
                {activeTab === 'upcoming' ? '📅' : activeTab === 'past' ? '🏁' : '🔍'}
              </Text>
              <Text style={styles.emptyTitle}>
                {activeTab === 'upcoming' ? 'Nenhuma sessão próxima' :
                 activeTab === 'past' ? 'Sem histórico ainda' : 'Nenhuma sessão disponível'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'upcoming' ? 'Explora sessões no mapa e faz a tua reserva!' :
                 activeTab === 'past' ? 'As tuas sessões passadas aparecerão aqui.' : 'Tenta novamente mais tarde.'}
              </Text>
              {activeTab === 'upcoming' && (
                <Pressable
                  style={styles.exploreButton}
                  onPress={() => router.push('/(app)/(tabs)')}
                >
                  <Text style={styles.exploreButtonText}>Explorar no Mapa</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[3],
  },
  title: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.extrabold,
    color: Colors.text,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[5],
    gap: Spacing[2],
    marginBottom: Spacing[4],
  },
  tab: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: Colors.textSecondary,
  },
  tabTextActive: { color: Colors.textInverse },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[8],
    gap: Spacing[3],
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing[12],
    paddingHorizontal: Spacing[8],
    gap: Spacing[3],
  },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: FontSize.base * 1.5,
  },
  exploreButton: {
    marginTop: Spacing[2],
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
  },
  exploreButtonText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.semibold,
    color: Colors.textInverse,
  },
});
