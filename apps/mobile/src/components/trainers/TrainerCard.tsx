import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadow } from '@constants/typography';

interface TrainerCardProps {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  averageRating?: number;
  totalReviews?: number;
  specialties?: string[];
  sessionCount?: number;
  compact?: boolean;
}

export function TrainerCard({
  id, displayName, avatarUrl, averageRating = 0,
  totalReviews = 0, specialties = [], sessionCount = 0, compact = false,
}: TrainerCardProps) {
  return (
    <Pressable
      style={[styles.card, compact && styles.cardCompact]}
      onPress={() => router.push(`/(app)/trainer/${id}`)}
    >
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={compact ? styles.avatarSm : styles.avatar} />
      ) : (
        <View style={[compact ? styles.avatarSm : styles.avatar, styles.avatarPlaceholder]}>
          <Text style={[styles.avatarInitial, compact && styles.avatarInitialSm]}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={[styles.name, compact && styles.nameSm]} numberOfLines={1}>{displayName}</Text>

        {!compact && specialties.length > 0 && (
          <View style={styles.chips}>
            {specialties.slice(0, 2).map(s => (
              <View key={s} style={styles.chip}>
                <Text style={styles.chipText}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.meta}>
          {averageRating > 0 ? (
            <Text style={styles.rating}>★ {averageRating.toFixed(1)} ({totalReviews})</Text>
          ) : (
            <Text style={styles.noRating}>Sem avaliações</Text>
          )}
          {!compact && sessionCount > 0 && (
            <Text style={styles.sessions}>· {sessionCount} sessões</Text>
          )}
        </View>
      </View>

      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing[3],
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing[4], ...Shadow.sm,
  },
  cardCompact: { padding: Spacing[3], borderRadius: BorderRadius.lg },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarSm: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 22, fontFamily: FontFamily.bold, color: Colors.textInverse },
  avatarInitialSm: { fontSize: 16 },
  info: { flex: 1, gap: 4 },
  name: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.text },
  nameSm: { fontSize: FontSize.sm },
  chips: { flexDirection: 'row', gap: Spacing[1] },
  chip: {
    paddingHorizontal: Spacing[2], paddingVertical: 2,
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.full,
  },
  chipText: { fontSize: 10, fontFamily: FontFamily.medium, color: Colors.primary },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold, color: Colors.accent },
  noRating: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textMuted },
  sessions: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textMuted },
  arrow: { fontSize: FontSize.xl, color: Colors.textMuted },
});
