import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Colors, CategoryColors, IntensityColors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadow } from '@constants/typography';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface SessionCardSession {
  id: string;
  title: string;
  category: string;
  type: string;
  price: number;
  location_name: string;
  date: string;
  start_time: string;
  current_participants: number;
  max_participants: number;
  is_boosted: boolean;
  intensity?: string;
  is_senior_friendly?: boolean;
  trainer?: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface SessionCardProps {
  session: SessionCardSession;
  onPress: () => void;
  compact?: boolean;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  running: '🏃', cycling: '🚴', yoga: '🧘', calisthenics: '💪',
  hiit: '⚡', strength: '🏋️', pilates: '🤸', crossfit: '🔥',
  mobility: '🌿', swimming: '🏊', martial_arts: '🥊', dance: '💃', other: '🏅',
};

export function SessionCard({ session, onPress, compact = false }: SessionCardProps) {
  const { t, i18n } = useTranslation();
  const isFull = session.current_participants >= session.max_participants;
  const spotsLeft = session.max_participants - session.current_participants;
  const categoryColor = CategoryColors[session.category] ?? Colors.textSecondary;
  const categoryEmoji = CATEGORY_EMOJIS[session.category] ?? '🏅';

  const dateObj = new Date(session.date + 'T' + session.start_time);
  const formattedDate = format(dateObj, "EEE, d MMM • HH'h'mm", {
    locale: i18n.language === 'pt' ? ptBR : undefined,
  });

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        pressed && styles.cardPressed,
        session.is_boosted && styles.cardBoosted,
      ]}
      onPress={onPress}
    >
      {/* Boosted badge */}
      {session.is_boosted && (
        <View style={styles.boostedBadge}>
          <Text style={styles.boostedText}>⭐ {t('map.boosted')}</Text>
        </View>
      )}

      <View style={styles.topRow}>
        {/* Category emoji */}
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
          <Text style={styles.categoryEmoji}>{categoryEmoji}</Text>
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.title} numberOfLines={2}>{session.title}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.category, { color: categoryColor }]}>
              {t(`categories.${session.category}`)}
            </Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.sessionType}>
              {session.type === 'trainer_led' ? t('map.trainer_led') : t('map.social_group')}
            </Text>
          </View>
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          {session.price === 0 ? (
            <Text style={styles.priceFree}>{t('common.free')}</Text>
          ) : (
            <>
              <Text style={styles.priceValue}>€{session.price}</Text>
              <Text style={styles.pricePer}>{t('common.per_session')}</Text>
            </>
          )}
        </View>
      </View>

      {/* Details */}
      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.detailText}>{formattedDate}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📍</Text>
          <Text style={styles.detailText} numberOfLines={1}>{session.location_name}</Text>
        </View>
      </View>

      {/* Bottom row */}
      <View style={styles.bottomRow}>
        {/* Trainer info */}
        {session.trainer && (
          <View style={styles.trainerRow}>
            {session.trainer.avatar_url ? (
              <Image source={{ uri: session.trainer.avatar_url }} style={styles.trainerAvatar} />
            ) : (
              <View style={styles.trainerAvatarPlaceholder}>
                <Text style={styles.trainerAvatarInitial}>
                  {session.trainer.display_name.charAt(0)}
                </Text>
              </View>
            )}
            <Text style={styles.trainerName}>{session.trainer.display_name}</Text>
          </View>
        )}

        {/* Capacity */}
        <View style={[styles.capacityBadge, isFull && styles.capacityBadgeFull]}>
          <Text style={[styles.capacityText, isFull && styles.capacityTextFull]}>
            {isFull
              ? t('common.full')
              : t('common.spots_left', { count: spotsLeft })
            }
          </Text>
        </View>

        {/* Senior friendly */}
        {session.is_senior_friendly && (
          <View style={styles.seniorBadge}>
            <Text style={styles.seniorText}>💙 Seniores</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing[3],
  },
  cardCompact: { padding: Spacing[3] },
  cardPressed: { opacity: 0.95, transform: [{ scale: 0.99 }] },
  cardBoosted: {
    borderColor: Colors.accent,
    borderWidth: 1.5,
  },
  boostedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accentLight,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing[3],
    paddingVertical: 2,
  },
  boostedText: { fontSize: FontSize.xs, fontFamily: FontFamily.semibold, color: Colors.accentDark },
  topRow: { flexDirection: 'row', gap: Spacing[3], alignItems: 'flex-start' },
  categoryBadge: {
    width: 44, height: 44, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  categoryEmoji: { fontSize: 22 },
  titleSection: { flex: 1, gap: 4 },
  title: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  category: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold },
  dot: { fontSize: FontSize.sm, color: Colors.textMuted },
  sessionType: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.textSecondary },
  priceContainer: { alignItems: 'flex-end' },
  priceFree: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.success },
  priceValue: { fontSize: FontSize.md, fontFamily: FontFamily.extrabold, color: Colors.text },
  pricePer: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textMuted },
  details: { gap: Spacing[2] },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  detailIcon: { fontSize: 14, width: 18 },
  detailText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.textSecondary, flex: 1 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  trainerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], flex: 1 },
  trainerAvatar: { width: 22, height: 22, borderRadius: 11 },
  trainerAvatarPlaceholder: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  trainerAvatarInitial: { fontSize: 10, fontFamily: FontFamily.bold, color: Colors.textInverse },
  trainerName: { fontSize: FontSize.sm, fontFamily: FontFamily.medium, color: Colors.textSecondary },
  capacityBadge: {
    backgroundColor: Colors.successLight, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing[3], paddingVertical: 3,
  },
  capacityBadgeFull: { backgroundColor: Colors.errorLight },
  capacityText: { fontSize: FontSize.xs, fontFamily: FontFamily.semibold, color: Colors.success },
  capacityTextFull: { color: Colors.error },
  seniorBadge: {
    backgroundColor: '#EFF6FF', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing[3], paddingVertical: 3,
  },
  seniorText: { fontSize: FontSize.xs, fontFamily: FontFamily.medium, color: '#2563EB' },
});
