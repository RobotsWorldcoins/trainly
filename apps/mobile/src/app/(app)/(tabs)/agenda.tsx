import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, addDays, isSameDay, isToday, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize } from '@constants/typography';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';

type ViewMode = 'day' | 'week' | 'month';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  confirmed:  { color: '#10B981', bg: '#D1FAE5', label: 'Confirmado' },
  pending:    { color: '#F59E0B', bg: '#FEF3C7', label: 'Pendente' },
  completed:  { color: '#6366F1', bg: '#EDE9FE', label: 'Concluído' },
  cancelled:  { color: '#EF4444', bg: '#FEE2E2', label: 'Cancelado' },
  no_show:    { color: '#9CA3AF', bg: '#F3F4F6', label: 'Faltou' },
};

const CATEGORY_EMOJI: Record<string, string> = {
  yoga: '🧘', running: '🏃', cycling: '🚴', swimming: '🏊',
  strength: '💪', hiit: '⚡', pilates: '🌀', boxing: '🥊',
  dance: '💃', tennis: '🎾', football: '⚽', basketball: '🏀',
  social_group: '👥', default: '🏋️',
};

export default function AgendaScreen() {
  const { profile } = useAuthStore();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const { data: bookings = [], refetch } = useQuery({
    queryKey: ['agenda', profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      const { data } = await supabase
        .from('session_participants')
        .select(`
          id, status, payment_status, created_at,
          session:sessions(
            id, title, starts_at, ends_at, category, location_name,
            price_cents, currency, trainer_id,
            trainer:profiles!trainer_id(display_name, avatar_url)
          )
        `)
        .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false });
      return (data ?? []).filter((b: any) => b.session);
    },
    enabled: !!profile,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Build week days
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const bookingsForDate = (date: Date) =>
    bookings.filter((b: any) => {
      const sessionDate = parseISO(b.session.starts_at);
      return isSameDay(sessionDate, date);
    });

  // Group bookings into sections for SectionList
  const sections = viewMode === 'day'
    ? [{ title: format(selectedDate, 'EEEE, d MMMM', { locale: pt }), data: bookingsForDate(selectedDate) }]
    : weekDays.map(day => ({
        title: format(day, 'EEEE, d MMM', { locale: pt }),
        date: day,
        data: bookingsForDate(day),
      })).filter(s => s.data.length > 0 || isSameDay(s.date!, selectedDate));

  const renderBookingCard = ({ item: b }: { item: any }) => {
    const session = b.session;
    const status = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pending;
    const emoji = CATEGORY_EMOJI[session.category] ?? CATEGORY_EMOJI.default;
    const startTime = format(parseISO(session.starts_at), 'HH:mm');
    const endTime = format(parseISO(session.ends_at), 'HH:mm');
    const isPaid = b.payment_status === 'paid';

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => router.push(`/(app)/session/${session.id}`)}
        activeOpacity={0.8}
      >
        <View style={[styles.categoryStripe, { backgroundColor: status.color }]} />
        <View style={styles.bookingContent}>
          <View style={styles.bookingHeader}>
            <Text style={styles.bookingEmoji}>{emoji}</Text>
            <View style={styles.bookingInfo}>
              <Text style={styles.bookingTitle} numberOfLines={1}>{session.title}</Text>
              <Text style={styles.bookingTrainer}>
                {session.trainer?.display_name ?? 'Grupo social'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
          <View style={styles.bookingMeta}>
            <Text style={styles.metaItem}>🕐 {startTime}–{endTime}</Text>
            <Text style={styles.metaItem}>📍 {session.location_name}</Text>
            {session.price_cents > 0 && (
              <Text style={[styles.metaItem, { color: isPaid ? '#10B981' : '#F59E0B' }]}>
                {isPaid ? '✅ Pago' : '⏳ Pendente'}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: any }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.data.length === 0 && (
        <Text style={styles.sectionEmpty}>Sem atividades</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agenda</Text>
        <View style={styles.viewModeToggle}>
          {(['day', 'week'] as ViewMode[]).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.modeBtn, viewMode === mode && styles.modeBtnActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.modeBtnText, viewMode === mode && styles.modeBtnTextActive]}>
                {mode === 'day' ? 'Dia' : 'Semana'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Week strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.weekStrip}
        contentContainerStyle={styles.weekStripContent}
      >
        {weekDays.map(day => {
          const dayBookings = bookingsForDate(day);
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[styles.dayChip, selected && styles.dayChipSelected, today && styles.dayChipToday]}
              onPress={() => { setSelectedDate(day); setViewMode('day'); }}
            >
              <Text style={[styles.dayName, selected && styles.dayTextSelected]}>
                {format(day, 'EEE', { locale: pt }).toUpperCase()}
              </Text>
              <Text style={[styles.dayNum, selected && styles.dayTextSelected]}>
                {format(day, 'd')}
              </Text>
              {dayBookings.length > 0 && (
                <View style={[styles.dot, selected && styles.dotSelected]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bookings list */}
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={renderBookingCard}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyTitle}>Sem atividades agendadas</Text>
            <Text style={styles.emptySubtitle}>Explora sessões no mapa e reserva a tua primeira!</Text>
            <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/(app)/(tabs)/')}>
              <Text style={styles.exploreBtnText}>Explorar Sessões</Text>
            </TouchableOpacity>
          </View>
        }
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 26, fontFamily: FontFamily.bold, color: Colors.text },
  viewModeToggle: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 10, padding: 2 },
  modeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  modeBtnActive: { backgroundColor: Colors.primary },
  modeBtnText: { fontSize: 13, fontFamily: FontFamily.medium, color: Colors.textMuted },
  modeBtnTextActive: { color: '#fff' },
  weekStrip: { maxHeight: 80 },
  weekStripContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  dayChip: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: Colors.surface, minWidth: 52 },
  dayChipSelected: { backgroundColor: Colors.primary },
  dayChipToday: { borderWidth: 2, borderColor: Colors.primary },
  dayName: { fontSize: 10, fontFamily: FontFamily.medium, color: Colors.textMuted },
  dayNum: { fontSize: 18, fontFamily: FontFamily.bold, color: Colors.text, marginVertical: 2 },
  dayTextSelected: { color: '#fff' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  dotSelected: { backgroundColor: '#fff' },
  list: { padding: 16, paddingBottom: 32 },
  sectionHeader: { marginBottom: 8, marginTop: 16 },
  sectionTitle: { fontSize: 14, fontFamily: FontFamily.semibold, color: Colors.textMuted, textTransform: 'capitalize' },
  sectionEmpty: { fontSize: 12, fontFamily: FontFamily.regular, color: Colors.textMuted, marginTop: 2 },
  bookingCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 16, marginBottom: 10, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  categoryStripe: { width: 4 },
  bookingContent: { flex: 1, padding: 14 },
  bookingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  bookingEmoji: { fontSize: 28 },
  bookingInfo: { flex: 1 },
  bookingTitle: { fontSize: 15, fontFamily: FontFamily.semibold, color: Colors.text },
  bookingTrainer: { fontSize: 12, fontFamily: FontFamily.regular, color: Colors.textMuted, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: FontFamily.semibold },
  bookingMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem: { fontSize: 12, fontFamily: FontFamily.regular, color: Colors.textSecondary },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontFamily: FontFamily.semibold, color: Colors.text, textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, fontFamily: FontFamily.regular, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  exploreBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  exploreBtnText: { fontSize: 15, fontFamily: FontFamily.semibold, color: '#fff' },
});
