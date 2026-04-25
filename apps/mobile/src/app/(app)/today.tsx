import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Colors } from '@constants/colors';
import { FontFamily } from '@constants/typography';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';

const GREETINGS = ['Bom dia', 'Boa tarde', 'Boa noite'];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return GREETINGS[0];
  if (h < 18) return GREETINGS[1];
  return GREETINGS[2];
}

const MOCK_STATS = { steps: 6240, distance: 4.3, calories: 318, xp: 1250, level: 7, xpToNext: 1500 };

const MOCK_UPCOMING = {
  id: 'sess_demo',
  title: 'HIIT ao ar livre',
  starts_at: new Date(Date.now() + 2 * 3600000).toISOString(),
  location_name: 'Parque Eduardo VII',
  category: 'hiit',
  trainer_name: 'Carlos Mendes',
};

const CATEGORY_EMOJI: Record<string, string> = {
  yoga: '🧘', running: '🏃', cycling: '🚴', swimming: '🏊',
  strength: '💪', hiit: '⚡', pilates: '🌀', boxing: '🥊',
  dance: '💃', default: '🏋️',
};

const QUICK_ACTIONS = [
  { label: 'Explorar', emoji: '🗺️', route: '/(app)/(tabs)/' as const },
  { label: 'Agenda', emoji: '📅', route: '/(app)/(tabs)/agenda' as const },
  { label: 'Dispositivos', emoji: '⌚', route: '/(app)/devices' as const },
  { label: 'Histórico', emoji: '📊', route: '/(app)/activity-history' as const },
];

export default function TodayScreen() {
  const { profile } = useAuthStore();
  const displayName = profile?.display_name?.split(' ')[0] ?? 'Atleta';

  const { data: nextSession } = useQuery({
    queryKey: ['today-next-session', profile?.id],
    queryFn: async () => {
      if (!profile) return MOCK_UPCOMING;
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('session_participants')
        .select(`
          session:sessions(id, title, starts_at, location_name, category,
            trainer:profiles!trainer_id(display_name))
        `)
        .eq('user_id', profile.user_id)
        .in('status', ['confirmed', 'pending'])
        .gte('session.starts_at', now)
        .order('session.starts_at', { ascending: true })
        .limit(1);
      if (data && data.length > 0) {
        const s = (data[0] as any).session;
        return {
          id: s.id,
          title: s.title,
          starts_at: s.starts_at,
          location_name: s.location_name,
          category: s.category,
          trainer_name: s.trainer?.display_name ?? 'Grupo social',
        };
      }
      return MOCK_UPCOMING;
    },
    enabled: true,
  });

  const xpProgress = MOCK_STATS.xp / MOCK_STATS.xpToNext;

  const sessionLabel = useMemo(() => {
    if (!nextSession) return '';
    const d = parseISO(nextSession.starts_at);
    if (isToday(d)) return `Hoje às ${format(d, 'HH:mm')}`;
    if (isTomorrow(d)) return `Amanhã às ${format(d, 'HH:mm')}`;
    return format(d, "EEE, d MMM 'às' HH:mm", { locale: pt });
  }, [nextSession]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header greeting */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}, {displayName} 👋</Text>
            <Text style={styles.date}>{format(new Date(), "EEEE, d 'de' MMMM", { locale: pt })}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/profile')} style={styles.avatarBtn}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* XP / Level card */}
        <View style={styles.xpCard}>
          <View style={styles.xpRow}>
            <View>
              <Text style={styles.xpLevel}>Nível {MOCK_STATS.level}</Text>
              <Text style={styles.xpPoints}>{MOCK_STATS.xp} / {MOCK_STATS.xpToNext} XP</Text>
            </View>
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeText}>🏆</Text>
            </View>
          </View>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${Math.round(xpProgress * 100)}%` }]} />
          </View>
          <Text style={styles.xpHint}>{MOCK_STATS.xpToNext - MOCK_STATS.xp} XP para o próximo nível</Text>
        </View>

        {/* Today stats */}
        <Text style={styles.sectionTitle}>📊 Hoje</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>👟</Text>
            <Text style={styles.statValue}>{MOCK_STATS.steps.toLocaleString('pt-PT')}</Text>
            <Text style={styles.statLabel}>Passos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>📍</Text>
            <Text style={styles.statValue}>{MOCK_STATS.distance} km</Text>
            <Text style={styles.statLabel}>Distância</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValue}>{MOCK_STATS.calories}</Text>
            <Text style={styles.statLabel}>kcal</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={[styles.statValue, { color: Colors.xpGold }]}>+45</Text>
            <Text style={styles.statLabel}>XP hoje</Text>
          </View>
        </View>

        {/* Next session */}
        {nextSession && (
          <>
            <Text style={styles.sectionTitle}>⚡ Próxima sessão</Text>
            <TouchableOpacity
              style={styles.sessionCard}
              onPress={() => router.push(`/(app)/session/${nextSession.id}` as any)}
              activeOpacity={0.85}
            >
              <View style={styles.sessionEmojiBg}>
                <Text style={styles.sessionEmoji}>
                  {CATEGORY_EMOJI[nextSession.category] ?? CATEGORY_EMOJI.default}
                </Text>
              </View>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionTitle} numberOfLines={1}>{nextSession.title}</Text>
                <Text style={styles.sessionMeta}>🕐 {sessionLabel}</Text>
                <Text style={styles.sessionMeta}>📍 {nextSession.location_name}</Text>
                <Text style={styles.sessionMeta}>👤 {nextSession.trainer_name}</Text>
              </View>
              <View style={styles.sessionArrow}>
                <Text style={styles.sessionArrowText}>›</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>🚀 Ações rápidas</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map(action => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickCard}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.75}
            >
              <Text style={styles.quickEmoji}>{action.emoji}</Text>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Streak */}
        <View style={styles.streakCard}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <View style={styles.streakInfo}>
            <Text style={styles.streakTitle}>5 dias seguidos!</Text>
            <Text style={styles.streakSub}>Mantém o ritmo — mais 2 dias para bónus XP</Text>
          </View>
        </View>

        <View style={styles.mockBanner}>
          <Text style={styles.mockBannerText}>🔧 Dados simulados — liga um dispositivo para métricas reais</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  greeting: { fontSize: 22, fontFamily: FontFamily.bold, color: Colors.text },
  date: { fontSize: 13, fontFamily: FontFamily.regular, color: Colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  avatarBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.border },
  avatarEmoji: { fontSize: 22 },

  xpCard: { backgroundColor: Colors.primary, borderRadius: 20, padding: 18, marginBottom: 24 },
  xpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  xpLevel: { fontSize: 18, fontFamily: FontFamily.bold, color: '#fff' },
  xpPoints: { fontSize: 13, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  xpBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  xpBadgeText: { fontSize: 22 },
  xpBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, marginBottom: 6 },
  xpBarFill: { height: 8, backgroundColor: '#fff', borderRadius: 4 },
  xpHint: { fontSize: 12, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.7)' },

  sectionTitle: { fontSize: 16, fontFamily: FontFamily.bold, color: Colors.text, marginBottom: 12 },

  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 24, flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: '22%', backgroundColor: Colors.surface, borderRadius: 16, padding: 14, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  statEmoji: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 16, fontFamily: FontFamily.bold, color: Colors.text },
  statLabel: { fontSize: 10, fontFamily: FontFamily.regular, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },

  sessionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 18, padding: 14, marginBottom: 24, gap: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, borderWidth: 1.5, borderColor: Colors.primary + '25' },
  sessionEmojiBg: { width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.primaryAlpha10, alignItems: 'center', justifyContent: 'center' },
  sessionEmoji: { fontSize: 28 },
  sessionInfo: { flex: 1, gap: 3 },
  sessionTitle: { fontSize: 15, fontFamily: FontFamily.bold, color: Colors.text },
  sessionMeta: { fontSize: 12, fontFamily: FontFamily.regular, color: Colors.textMuted },
  sessionArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primaryAlpha10, alignItems: 'center', justifyContent: 'center' },
  sessionArrowText: { fontSize: 20, color: Colors.primary, lineHeight: 26 },

  quickGrid: { flexDirection: 'row', gap: 10, marginBottom: 24, flexWrap: 'wrap' },
  quickCard: { flex: 1, minWidth: '22%', backgroundColor: Colors.surface, borderRadius: 16, padding: 14, alignItems: 'center', gap: 6, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  quickEmoji: { fontSize: 26 },
  quickLabel: { fontSize: 11, fontFamily: FontFamily.medium, color: Colors.text, textAlign: 'center' },

  streakCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFF7ED', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#FED7AA' },
  streakEmoji: { fontSize: 32 },
  streakInfo: { flex: 1 },
  streakTitle: { fontSize: 15, fontFamily: FontFamily.bold, color: '#C2410C' },
  streakSub: { fontSize: 12, fontFamily: FontFamily.regular, color: '#EA580C', marginTop: 2 },

  mockBanner: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 10, alignItems: 'center' },
  mockBannerText: { fontSize: 11, fontFamily: FontFamily.regular, color: Colors.textMuted, textAlign: 'center' },
});
