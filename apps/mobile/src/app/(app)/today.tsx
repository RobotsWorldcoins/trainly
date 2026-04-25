import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { pt } from 'date-fns/locale';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors } from '@constants/colors';
import { FontFamily } from '@constants/typography';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';

const { width: SCREEN_W } = Dimensions.get('window');
const RING_SIZE = 200;
const RING_CX = RING_SIZE / 2;
const RING_CY = RING_SIZE / 2;

// ─── Activity Ring component (Apple-style) ─────────────────────────────────
interface RingProps {
  progress: number;   // 0–1
  radius: number;
  strokeWidth: number;
  color: string;
  bgColor: string;
}

function ActivityRing({ progress, radius, strokeWidth, color, bgColor }: RingProps) {
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(progress, 1));
  const cx = RING_CX;
  const cy = RING_CY;
  return (
    <>
      {/* Track */}
      <Circle
        cx={cx} cy={cy} r={radius}
        stroke={bgColor} strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Progress */}
      <Circle
        cx={cx} cy={cy} r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        rotation="-90"
        originX={cx}
        originY={cy}
      />
    </>
  );
}

// ─── Mock data ─────────────────────────────────────────────────────────────
const MOCK = {
  move: { val: 403, goal: 500 },
  exercise: { val: 42, goal: 30 },
  stand: { val: 7, goal: 12 },
  steps: 8_240,
  distance: 5.8,
  calories: 403,
  xp: 1_250, xpGoal: 1_500,
  level: 7,
  streak: 5,
};

const MOCK_NEXT = {
  id: 'sess_demo', title: 'HIIT ao ar livre', category: 'hiit',
  starts_at: new Date(Date.now() + 2 * 3_600_000).toISOString(),
  location_name: 'Parque Eduardo VII', trainer_name: 'Carlos Mendes',
};

const CATEGORY_EMOJI: Record<string, string> = {
  yoga: '🧘', running: '🏃', cycling: '🚴', swimming: '🏊',
  strength: '💪', hiit: '⚡', pilates: '🌀', boxing: '🥊',
  dance: '💃', default: '🏋️',
};

const QUICK = [
  { label: 'Explorar', emoji: '🗺️', route: '/(app)/(tabs)/' as const },
  { label: 'Agenda', emoji: '📅', route: '/(app)/(tabs)/agenda' as const },
  { label: 'Wearables', emoji: '⌚', route: '/(app)/devices' as const },
  { label: 'Histórico', emoji: '📊', route: '/(app)/activity-history' as const },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// ─── Screen ────────────────────────────────────────────────────────────────
export default function TodayScreen() {
  const { profile } = useAuthStore();
  const firstName = profile?.display_name?.split(' ')[0] ?? 'Atleta';

  const { data: nextSession } = useQuery({
    queryKey: ['today-next', profile?.id],
    queryFn: async () => {
      if (!profile) return MOCK_NEXT;
      const { data } = await supabase
        .from('session_participants')
        .select(`session:sessions(id,title,starts_at,location_name,category,trainer:profiles!trainer_id(display_name))`)
        .eq('user_id', profile.user_id)
        .in('status', ['confirmed', 'pending'])
        .gte('session.starts_at', new Date().toISOString())
        .order('session.starts_at', { ascending: true })
        .limit(1);
      if (data?.length) {
        const s = (data[0] as any).session;
        return { id: s.id, title: s.title, starts_at: s.starts_at, location_name: s.location_name, category: s.category, trainer_name: s.trainer?.display_name ?? 'Grupo' };
      }
      return MOCK_NEXT;
    },
    enabled: true,
    staleTime: 60_000,
  });

  const timeLabel = useMemo(() => {
    if (!nextSession) return '';
    const d = parseISO(nextSession.starts_at);
    if (isToday(d)) return `Hoje · ${format(d, 'HH:mm')}`;
    if (isTomorrow(d)) return `Amanhã · ${format(d, 'HH:mm')}`;
    return format(d, "EEE d MMM · HH:mm", { locale: pt });
  }, [nextSession]);

  const movePct   = MOCK.move.val / MOCK.move.goal;
  const exPct     = MOCK.exercise.val / MOCK.exercise.goal;
  const standPct  = MOCK.stand.val / MOCK.stand.goal;
  const xpPct     = MOCK.xp / MOCK.xpGoal;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{firstName} 👋</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/profile')} style={styles.avatarBtn}>
            <Text style={styles.avatarLetter}>{firstName[0]?.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Activity Rings Hero ── */}
        <View style={styles.ringsCard}>
          <View style={styles.ringsRow}>
            {/* SVG rings */}
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Defs>
                <LinearGradient id="moveGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#FF375F" />
                  <Stop offset="1" stopColor="#FF6B9D" />
                </LinearGradient>
                <LinearGradient id="exGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#A2FD4F" />
                  <Stop offset="1" stopColor="#30D158" />
                </LinearGradient>
                <LinearGradient id="stGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#00E5FF" />
                  <Stop offset="1" stopColor="#0EA5E9" />
                </LinearGradient>
              </Defs>
              {/* Stand — outer */}
              <ActivityRing progress={standPct} radius={90} strokeWidth={14} color="#0EA5E9" bgColor="rgba(14,165,233,0.18)" />
              {/* Exercise — middle */}
              <ActivityRing progress={exPct} radius={72} strokeWidth={14} color="#30D158" bgColor="rgba(48,209,88,0.18)" />
              {/* Move — inner */}
              <ActivityRing progress={movePct} radius={54} strokeWidth={14} color="#FF375F" bgColor="rgba(255,55,95,0.18)" />
            </Svg>

            {/* Ring legend */}
            <View style={styles.ringsLegend}>
              <RingRow label="Move" val={MOCK.move.val} goal={MOCK.move.goal} unit="CAL" color="#FF375F" />
              <RingRow label="Exercício" val={MOCK.exercise.val} goal={MOCK.exercise.goal} unit="MIN" color="#30D158" />
              <RingRow label="Em pé" val={MOCK.stand.val} goal={MOCK.stand.goal} unit="HRS" color="#0EA5E9" />
            </View>
          </View>

          <Text style={styles.ringsMock}>🔧 Demo — liga um wearable para dados reais</Text>
        </View>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <StatChip emoji="👟" val={MOCK.steps.toLocaleString('pt-PT')} label="Passos" />
          <StatChip emoji="📍" val={`${MOCK.distance} km`} label="Distância" />
          <StatChip emoji="🔥" val={`${MOCK.calories}`} label="kcal" />
        </View>

        {/* ── XP bar ── */}
        <View style={styles.xpCard}>
          <View style={styles.xpTop}>
            <View>
              <Text style={styles.xpLevel}>Nível {MOCK.level}</Text>
              <Text style={styles.xpSub}>{MOCK.xp.toLocaleString('pt-PT')} / {MOCK.xpGoal.toLocaleString('pt-PT')} XP</Text>
            </View>
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeEmoji}>🏆</Text>
            </View>
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${Math.round(xpPct * 100)}%` as any }]} />
          </View>
          <Text style={styles.xpHint}>{(MOCK.xpGoal - MOCK.xp).toLocaleString('pt-PT')} XP para subir de nível</Text>
        </View>

        {/* ── Streak ── */}
        <View style={styles.streakCard}>
          <Text style={styles.streakFire}>🔥</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>{MOCK.streak} dias de série!</Text>
            <Text style={styles.streakSub}>Mais {7 - MOCK.streak} dias para o bónus de XP semanal</Text>
          </View>
          <View style={styles.streakDots}>
            {Array.from({ length: 7 }, (_, i) => (
              <View key={i} style={[styles.streakDot, i < MOCK.streak && styles.streakDotOn]} />
            ))}
          </View>
        </View>

        {/* ── Next session ── */}
        {nextSession && (
          <>
            <SectionHeader title="⚡ Próxima sessão" />
            <TouchableOpacity
              style={styles.sessionCard}
              onPress={() => router.push(`/(app)/session/${nextSession.id}` as any)}
              activeOpacity={0.85}
            >
              <View style={styles.sessionLeft}>
                <Text style={styles.sessionEmoji}>{CATEGORY_EMOJI[nextSession.category] ?? CATEGORY_EMOJI.default}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionTitle} numberOfLines={1}>{nextSession.title}</Text>
                <Text style={styles.sessionMeta}>🕐 {timeLabel}</Text>
                <Text style={styles.sessionMeta}>📍 {nextSession.location_name}</Text>
                <Text style={styles.sessionMeta}>👤 {nextSession.trainer_name}</Text>
              </View>
              <View style={styles.sessionChevron}>
                <Text style={styles.sessionChevronText}>›</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* ── Quick actions ── */}
        <SectionHeader title="🚀 Acesso rápido" />
        <View style={styles.quickGrid}>
          {QUICK.map(q => (
            <TouchableOpacity
              key={q.label}
              style={styles.quickCard}
              onPress={() => router.push(q.route as any)}
              activeOpacity={0.75}
            >
              <Text style={styles.quickEmoji}>{q.emoji}</Text>
              <Text style={styles.quickLabel}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function RingRow({ label, val, goal, unit, color }: { label: string; val: number; goal: number; unit: string; color: string }) {
  return (
    <View style={styles.ringRow}>
      <View style={[styles.ringDot, { backgroundColor: color }]} />
      <View>
        <Text style={styles.ringRowLabel}>{label}</Text>
        <Text style={[styles.ringRowVal, { color }]}>{val}<Text style={styles.ringRowGoal}>/{goal} {unit}</Text></Text>
      </View>
    </View>
  );
}

function StatChip({ emoji, val, label }: { emoji: string; val: string; label: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statVal}>{val}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const CARD_RADIUS = 22;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E' },
  scroll: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 32 },

  // header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  greeting: { fontSize: 13, fontFamily: FontFamily.medium, color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' },
  name: { fontSize: 24, fontFamily: FontFamily.bold, color: '#FFFFFF', marginTop: 2 },
  avatarBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 18, fontFamily: FontFamily.bold, color: '#fff' },

  // rings hero
  ringsCard: {
    backgroundColor: '#141928',
    borderRadius: CARD_RADIUS,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  ringsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ringsLegend: { flex: 1, gap: 14 },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ringDot: { width: 10, height: 10, borderRadius: 5 },
  ringRowLabel: { fontSize: 11, fontFamily: FontFamily.medium, color: 'rgba(255,255,255,0.45)' },
  ringRowVal: { fontSize: 17, fontFamily: FontFamily.bold },
  ringRowGoal: { fontSize: 12, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.35)' },
  ringsMock: { marginTop: 14, fontSize: 10, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.25)', textAlign: 'center' },

  // stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statChip: { flex: 1, backgroundColor: '#141928', borderRadius: 18, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statVal: { fontSize: 15, fontFamily: FontFamily.bold, color: '#FFFFFF' },
  statLabel: { fontSize: 10, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  // xp
  xpCard: {
    backgroundColor: '#1B2547',
    borderRadius: CARD_RADIUS,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(27,111,235,0.3)',
  },
  xpTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  xpLevel: { fontSize: 18, fontFamily: FontFamily.bold, color: '#FFFFFF' },
  xpSub: { fontSize: 12, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  xpBadge: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  xpBadgeEmoji: { fontSize: 20 },
  xpTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 },
  xpFill: { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  xpHint: { fontSize: 11, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.35)', marginTop: 8 },

  // streak
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E1208',
    borderRadius: CARD_RADIUS,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.25)',
  },
  streakFire: { fontSize: 32 },
  streakTitle: { fontSize: 15, fontFamily: FontFamily.bold, color: '#FB923C' },
  streakSub: { fontSize: 11, fontFamily: FontFamily.regular, color: 'rgba(251,146,60,0.6)', marginTop: 2 },
  streakDots: { flexDirection: 'column', gap: 4, alignItems: 'center' },
  streakDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)' },
  streakDotOn: { backgroundColor: '#FB923C' },

  // section title
  sectionTitle: { fontSize: 15, fontFamily: FontFamily.bold, color: '#FFFFFF', marginBottom: 10 },

  // next session
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141928',
    borderRadius: CARD_RADIUS,
    padding: 16,
    marginBottom: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(27,111,235,0.25)',
  },
  sessionLeft: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(27,111,235,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  sessionEmoji: { fontSize: 28 },
  sessionTitle: { fontSize: 15, fontFamily: FontFamily.bold, color: '#FFFFFF', marginBottom: 4 },
  sessionMeta: { fontSize: 12, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  sessionChevron: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  sessionChevronText: { fontSize: 20, color: 'rgba(255,255,255,0.5)', lineHeight: 26 },

  // quick actions
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: {
    width: (SCREEN_W - 36 - 10) / 2,
    backgroundColor: '#141928',
    borderRadius: 18,
    padding: 16,
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  quickEmoji: { fontSize: 28 },
  quickLabel: { fontSize: 13, fontFamily: FontFamily.semibold, color: '#FFFFFF' },
});
