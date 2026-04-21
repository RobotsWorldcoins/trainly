import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, CategoryColors, IntensityColors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadow } from '@constants/typography';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { BODY_AREAS } from '@trainly/shared';

async function fetchSession(id: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      trainer:profiles!trainer_id(
        id, display_name, avatar_url, bio, city,
        review_summary:trainer_review_summary(avg_overall, total_reviews)
      ),
      participants:session_participants(
        id, status,
        profile:profiles(display_name, avatar_url)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

async function checkUserBooking(sessionId: string, userId: string) {
  const { data } = await supabase
    .from('session_participants')
    .select('id, status')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .single();
  return data;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  running: '🏃', cycling: '🚴', yoga: '🧘', calisthenics: '💪',
  hiit: '⚡', strength: '🏋️', pilates: '🤸', crossfit: '🔥',
  mobility: '🌿', swimming: '🏊', martial_arts: '🥊', dance: '💃', other: '🏅',
};

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { user, session: authSession } = useAuthStore();

  const { data: sessionData, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: () => fetchSession(id),
  });

  const { data: userBooking } = useQuery({
    queryKey: ['user-booking', id, user?.id],
    queryFn: () => checkUserBooking(id, user!.id),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!sessionData) return null;

  const s = sessionData as any;
  const isFull = s.current_participants >= s.max_participants;
  const hasBooked = !!userBooking && userBooking.status === 'confirmed';
  const categoryColor = CategoryColors[s.category] ?? Colors.textSecondary;
  const categoryEmoji = CATEGORY_EMOJIS[s.category] ?? '🏅';

  const dateStr = format(
    new Date(s.date + 'T' + s.start_time),
    "EEEE, d 'de' MMMM 'de' yyyy",
    { locale: i18n.language === 'pt' ? ptBR : undefined }
  );

  const handleBook = () => {
    if (!authSession) {
      router.push('/(auth)/login');
      return;
    }
    router.push(`/(app)/session/book/${id}`);
  };

  const handleCheckin = () => {
    router.push(`/(app)/checkin/${id}`);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient
          colors={[categoryColor + 'CC', categoryColor + '66']}
          style={styles.hero}
        >
          <SafeAreaView edges={['top']}>
            <View style={styles.heroTop}>
              <Pressable style={styles.backBtn} onPress={() => router.back()}>
                <Text style={styles.backIcon}>←</Text>
              </Pressable>
              {s.is_boosted && (
                <View style={styles.heroBoostBadge}>
                  <Text style={styles.heroBoostText}>⭐ Destaque</Text>
                </View>
              )}
            </View>
          </SafeAreaView>

          <View style={styles.heroContent}>
            <Text style={styles.heroEmoji}>{categoryEmoji}</Text>
            <Text style={styles.heroTitle}>{s.title}</Text>
            <View style={styles.heroMeta}>
              <View style={[styles.heroCategoryBadge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Text style={styles.heroCategoryText}>{t(`categories.${s.category}`)}</Text>
              </View>
              <View style={[styles.heroCategoryBadge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Text style={styles.heroCategoryText}>{t(`intensity.${s.intensity}`)}</Text>
              </View>
              {s.is_senior_friendly && (
                <View style={[styles.heroCategoryBadge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                  <Text style={styles.heroCategoryText}>💙 Seniores</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Quick info row */}
          <View style={styles.quickInfo}>
            <View style={styles.quickItem}>
              <Text style={styles.quickIcon}>📅</Text>
              <Text style={styles.quickText}>{dateStr}</Text>
            </View>
            <View style={styles.quickItem}>
              <Text style={styles.quickIcon}>🕐</Text>
              <Text style={styles.quickText}>
                {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
              </Text>
            </View>
            <View style={styles.quickItem}>
              <Text style={styles.quickIcon}>📍</Text>
              <Text style={styles.quickText} numberOfLines={2}>{s.location_name}</Text>
            </View>
            <View style={styles.quickItem}>
              <Text style={styles.quickIcon}>👥</Text>
              <Text style={styles.quickText}>
                {s.current_participants}/{s.max_participants} participantes
              </Text>
            </View>
          </View>

          {/* Description */}
          {s.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sobre esta sessão</Text>
              <Text style={styles.description}>{s.description}</Text>
            </View>
          )}

          {/* Body areas */}
          {s.body_areas?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('sessions.body_areas')}</Text>
              <View style={styles.bodyAreas}>
                {s.body_areas.map((area: string) => {
                  const areaInfo = BODY_AREAS.find(a => a.key === area);
                  return (
                    <View key={area} style={styles.bodyAreaChip}>
                      <Text style={styles.bodyAreaIcon}>{areaInfo?.icon}</Text>
                      <Text style={styles.bodyAreaLabel}>{areaInfo?.label_pt ?? area}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalhes</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>{t('sessions.intensity_label')}</Text>
                <View style={[styles.intensityBadge, { backgroundColor: IntensityColors[s.intensity as any] + '20' }]}>
                  <Text style={[styles.intensityText, { color: IntensityColors[s.intensity as any] }]}>
                    {t(`intensity.${s.intensity}`)}
                  </Text>
                </View>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>{t('sessions.skill_level_label')}</Text>
                <Text style={styles.detailValue}>{t(`skill_level.${s.skill_level}`)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>{t('sessions.min_participants')}</Text>
                <Text style={styles.detailValue}>{s.min_participants}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>{t('sessions.max_participants')}</Text>
                <Text style={styles.detailValue}>{s.max_participants}</Text>
              </View>
            </View>
          </View>

          {/* Cancellation policy */}
          {s.cancellation_policy && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('sessions.cancellation_policy')}</Text>
              <View style={styles.policyCard}>
                <Text style={styles.policyText}>{s.cancellation_policy}</Text>
              </View>
            </View>
          )}

          {/* Trainer card */}
          {s.trainer && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('sessions.trainer')}</Text>
              <Pressable
                style={styles.trainerCard}
                onPress={() => router.push(`/(app)/trainer/${s.trainer.id}`)}
              >
                {s.trainer.avatar_url ? (
                  <Image source={{ uri: s.trainer.avatar_url }} style={styles.trainerAvatar} />
                ) : (
                  <View style={styles.trainerAvatarPlaceholder}>
                    <Text style={styles.trainerAvatarInitial}>
                      {s.trainer.display_name.charAt(0)}
                    </Text>
                  </View>
                )}
                <View style={styles.trainerInfo}>
                  <Text style={styles.trainerName}>{s.trainer.display_name}</Text>
                  {s.trainer.bio && (
                    <Text style={styles.trainerBio} numberOfLines={2}>{s.trainer.bio}</Text>
                  )}
                  {s.trainer.review_summary && s.trainer.review_summary.total_reviews > 0 && (
                    <View style={styles.ratingRow}>
                      <Text style={styles.starIcon}>⭐</Text>
                      <Text style={styles.ratingText}>
                        {s.trainer.review_summary.avg_overall?.toFixed(1)} ({s.trainer.review_summary.total_reviews} avaliações)
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.trainerArrow}>›</Text>
              </Pressable>
            </View>
          )}

          {/* Notes */}
          {s.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('sessions.notes')}</Text>
              <Text style={styles.description}>{s.notes}</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        <View style={styles.priceInfo}>
          {s.price === 0 ? (
            <Text style={styles.priceFree}>{t('common.free')}</Text>
          ) : (
            <>
              <Text style={styles.priceValue}>€{s.price}</Text>
              <Text style={styles.pricePer}>{t('common.per_session')}</Text>
            </>
          )}
        </View>

        {hasBooked ? (
          <View style={styles.bookedActions}>
            <View style={styles.bookedBadge}>
              <Text style={styles.bookedText}>✓ Reservado</Text>
            </View>
            <Pressable style={styles.checkinButton} onPress={handleCheckin}>
              <Text style={styles.checkinButtonText}>{t('sessions.check_in')}</Text>
            </Pressable>
          </View>
        ) : isFull ? (
          <View style={styles.fullBadge}>
            <Text style={styles.fullText}>{t('sessions.session_full')}</Text>
          </View>
        ) : (
          <Pressable style={styles.bookButton} onPress={handleBook}>
            <Text style={styles.bookButtonText}>
              {s.type === 'trainer_led' ? t('sessions.book_now') : t('sessions.join_group')}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: {
    paddingBottom: Spacing[6],
    minHeight: 220,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { fontSize: FontSize.lg, color: Colors.textInverse },
  heroBoostBadge: {
    backgroundColor: Colors.accent, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing[3], paddingVertical: 4,
  },
  heroBoostText: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.textInverse },
  heroContent: { paddingHorizontal: Spacing[5], gap: Spacing[3] },
  heroEmoji: { fontSize: 40 },
  heroTitle: { fontSize: FontSize['2xl'], fontFamily: FontFamily.extrabold, color: Colors.textInverse },
  heroMeta: { flexDirection: 'row', gap: Spacing[2], flexWrap: 'wrap' },
  heroCategoryBadge: {
    borderRadius: BorderRadius.full, paddingHorizontal: Spacing[3], paddingVertical: 4,
  },
  heroCategoryText: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold, color: Colors.textInverse },
  content: { padding: Spacing[5], gap: 0 },
  quickInfo: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing[4], gap: Spacing[3], marginBottom: Spacing[5], ...Shadow.sm,
  },
  quickItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[3] },
  quickIcon: { fontSize: 16, width: 20 },
  quickText: { flex: 1, fontSize: FontSize.base, fontFamily: FontFamily.medium, color: Colors.text },
  section: { marginBottom: Spacing[6] },
  sectionTitle: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.text, marginBottom: Spacing[3] },
  description: { fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.textSecondary, lineHeight: FontSize.base * 1.6 },
  bodyAreas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  bodyAreaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primaryAlpha10, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[2],
  },
  bodyAreaIcon: { fontSize: 16 },
  bodyAreaLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.medium, color: Colors.primary },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[4] },
  detailItem: { width: '45%', gap: Spacing[1] },
  detailLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.medium, color: Colors.textSecondary },
  detailValue: { fontSize: FontSize.base, fontFamily: FontFamily.semibold, color: Colors.text },
  intensityBadge: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing[3], paddingVertical: 4, alignSelf: 'flex-start' },
  intensityText: { fontSize: FontSize.sm, fontFamily: FontFamily.bold },
  policyCard: { backgroundColor: Colors.warningLight, borderRadius: BorderRadius.lg, padding: Spacing[4] },
  policyText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: '#92400E', lineHeight: FontSize.sm * 1.6 },
  trainerCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing[4], flexDirection: 'row', alignItems: 'center', gap: Spacing[4], ...Shadow.sm,
  },
  trainerAvatar: { width: 52, height: 52, borderRadius: 26 },
  trainerAvatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  trainerAvatarInitial: { fontSize: FontSize.lg, fontFamily: FontFamily.bold, color: Colors.textInverse },
  trainerInfo: { flex: 1, gap: 3 },
  trainerName: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.text },
  trainerBio: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.textSecondary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starIcon: { fontSize: 13 },
  ratingText: { fontSize: FontSize.sm, fontFamily: FontFamily.medium, color: Colors.textSecondary },
  trainerArrow: { fontSize: FontSize.xl, color: Colors.textMuted },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: Spacing[5], paddingVertical: Spacing[4],
    paddingBottom: 34,
    flexDirection: 'row', alignItems: 'center', gap: Spacing[4],
  },
  priceInfo: { flex: 1 },
  priceFree: { fontSize: FontSize.lg, fontFamily: FontFamily.extrabold, color: Colors.success },
  priceValue: { fontSize: FontSize.xl, fontFamily: FontFamily.extrabold, color: Colors.text },
  pricePer: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textMuted },
  bookButton: {
    flex: 2, backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[4], alignItems: 'center',
  },
  bookButtonText: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.textInverse },
  bookedActions: { flex: 2, flexDirection: 'row', gap: Spacing[3] },
  bookedBadge: {
    flex: 1, backgroundColor: Colors.successLight, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[4], alignItems: 'center',
  },
  bookedText: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.success },
  checkinButton: {
    flex: 1, backgroundColor: Colors.accent, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[4], alignItems: 'center',
  },
  checkinButtonText: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.textInverse },
  fullBadge: {
    flex: 2, backgroundColor: Colors.errorLight, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[4], alignItems: 'center',
  },
  fullText: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.error },
});
