import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@lib/supabase';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadow } from '@constants/typography';

async function fetchTrainerProfile(id: string) {
  const [profileRes, reviewsRes, sessionsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url, bio, role, trainer_since, total_xp, current_level')
      .eq('id', id)
      .single(),
    supabase
      .from('reviews')
      .select('id, rating, comment, created_at, reviewer:profiles!reviewer_id(display_name, avatar_url)')
      .eq('trainer_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('sessions')
      .select('id, title, date, start_time, category, price, current_participants, max_participants')
      .eq('trainer_id', id)
      .eq('status', 'published')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(6),
  ]);

  const summary = await supabase
    .from('trainer_review_summary')
    .select('*')
    .eq('trainer_id', id)
    .maybeSingle();

  const specialties = await supabase
    .from('trainer_specialties')
    .select('specialty')
    .eq('trainer_id', id);

  return {
    profile: profileRes.data,
    reviews: reviewsRes.data || [],
    sessions: sessionsRes.data || [],
    summary: summary.data,
    specialties: specialties.data?.map((s: any) => s.specialty) || [],
  };
}

export default function TrainerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['trainer-profile', id],
    queryFn: () => fetchTrainerProfile(id),
  });

  if (isLoading || !data?.profile) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const { profile, reviews, sessions, summary, specialties } = data;
  const avgRating = summary?.average_rating ?? 0;
  const totalReviews = summary?.total_reviews ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Perfil do treinador</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient colors={['#1B6FEB', '#0F4FA8']} style={styles.hero}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{profile.display_name?.charAt(0)}</Text>
            </View>
          )}
          <Text style={styles.heroName}>{profile.display_name}</Text>
          {profile.trainer_since && (
            <Text style={styles.heroSince}>
              Treinador desde {format(new Date(profile.trainer_since), 'MMMM yyyy', { locale: ptBR })}
            </Text>
          )}
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{avgRating > 0 ? avgRating.toFixed(1) : '—'}</Text>
              <Text style={styles.heroStatLabel}>★ Avaliação</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{totalReviews}</Text>
              <Text style={styles.heroStatLabel}>Avaliações</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{sessions.length}</Text>
              <Text style={styles.heroStatLabel}>Sessões</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Bio */}
        {profile.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sobre</Text>
            <Text style={styles.bio}>{profile.bio}</Text>
          </View>
        )}

        {/* Specialties */}
        {specialties.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Especialidades</Text>
            <View style={styles.chips}>
              {specialties.map((s: string) => (
                <View key={s} style={styles.chip}>
                  <Text style={styles.chipText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Upcoming sessions */}
        {sessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Próximas sessões</Text>
            {sessions.map((s: any) => (
              <Pressable key={s.id} style={styles.sessionCard} onPress={() => router.push(`/(app)/session/${s.id}`)}>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionTitle} numberOfLines={1}>{s.title}</Text>
                  <Text style={styles.sessionMeta}>
                    {format(new Date(s.date), "d MMM", { locale: ptBR })} · {s.start_time?.slice(0, 5)}
                  </Text>
                </View>
                <View style={styles.sessionRight}>
                  <Text style={styles.sessionPrice}>
                    {s.price === 0 ? 'Grátis' : `€${s.price?.toFixed(2)}`}
                  </Text>
                  <Text style={styles.sessionSpots}>{s.max_participants - s.current_participants} vagas</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Avaliações ({totalReviews})</Text>
            {reviews.map((r: any) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewName}>{r.reviewer?.display_name || 'Utilizador'}</Text>
                  <Text style={styles.reviewRating}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
                </View>
                {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
                <Text style={styles.reviewDate}>
                  {format(new Date(r.created_at), "d 'de' MMMM yyyy", { locale: ptBR })}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
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
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: FontSize.xl, color: Colors.text },
  headerTitle: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.text },
  hero: { padding: Spacing[6], alignItems: 'center', gap: Spacing[3] },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 40, fontFamily: FontFamily.bold, color: Colors.textInverse },
  heroName: { fontSize: FontSize.xl, fontFamily: FontFamily.extrabold, color: Colors.textInverse },
  heroSince: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.7)' },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: Spacing[4], marginTop: Spacing[2] },
  heroStat: { alignItems: 'center' },
  heroStatValue: { fontSize: FontSize.xl, fontFamily: FontFamily.extrabold, color: Colors.textInverse },
  heroStatLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.7)' },
  heroStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.3)' },
  section: { padding: Spacing[5], gap: Spacing[3] },
  sectionTitle: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.text },
  bio: { fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.textSecondary, lineHeight: FontSize.base * 1.6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  chip: {
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[1],
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.full,
  },
  chipText: { fontSize: FontSize.sm, fontFamily: FontFamily.medium, color: Colors.primary },
  sessionCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing[4], ...Shadow.sm,
  },
  sessionInfo: { flex: 1, gap: 4 },
  sessionTitle: { fontSize: FontSize.base, fontFamily: FontFamily.semibold, color: Colors.text },
  sessionMeta: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.textSecondary },
  sessionRight: { alignItems: 'flex-end', gap: 4 },
  sessionPrice: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.primary },
  sessionSpots: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textMuted },
  reviewCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing[4], ...Shadow.sm, gap: Spacing[2],
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewName: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.text },
  reviewRating: { fontSize: FontSize.base, color: Colors.accent },
  reviewComment: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.textSecondary, lineHeight: FontSize.sm * 1.5 },
  reviewDate: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textMuted },
});
