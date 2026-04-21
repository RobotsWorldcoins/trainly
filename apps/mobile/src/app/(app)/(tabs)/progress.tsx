import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadow } from '@constants/typography';
import { useAuthStore } from '@stores/auth.store';
import { supabase } from '@lib/supabase';
import { LEVEL_THRESHOLDS, BODY_AREAS } from '@trainly/shared';
import { BodyProgressAvatar } from '@components/progress/BodyProgressAvatar';
import { XPBar } from '@components/progress/XPBar';

async function fetchProgressData(userId: string) {
  const [badgesRes, bodyRes, xpRes] = await Promise.all([
    supabase
      .from('user_badges')
      .select('badge:badges(name, icon, description)')
      .eq('user_id', userId),
    supabase
      .from('user_progress_body_areas')
      .select('*')
      .eq('user_id', userId),
    supabase
      .from('xp_logs')
      .select('amount, source, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return {
    badges: (badgesRes.data || []).map((b: any) => b.badge).filter(Boolean),
    bodyAreas: bodyRes.data || [],
    recentXP: xpRes.data || [],
  };
}

export default function ProgressScreen() {
  const { t } = useTranslation();
  const { profile, user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['progress', user?.id],
    queryFn: () => fetchProgressData(user!.id),
    enabled: !!user,
  });

  if (!profile) return null;

  const currentLevelData = LEVEL_THRESHOLDS.find(l => l.level === profile.current_level);
  const nextLevelData = LEVEL_THRESHOLDS.find(l => l.level === profile.current_level + 1);

  const xpForCurrentLevel = currentLevelData?.min_xp ?? 0;
  const xpForNextLevel = nextLevelData?.min_xp ?? profile.total_xp + 1;
  const xpProgress = profile.total_xp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('progress.title')}</Text>
        </View>

        {/* Level card */}
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={styles.levelCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.levelBadge}>
            <Text style={styles.levelNumber}>{profile.current_level}</Text>
          </View>
          <View style={styles.levelInfo}>
            <Text style={styles.levelLabel}>
              {t('progress.level', { level: profile.current_level })}
            </Text>
            <Text style={styles.levelTitle}>
              {currentLevelData?.label ?? 'Iniciante'}
            </Text>
            <XPBar
              current={xpProgress}
              max={xpNeeded}
              style={styles.xpBar}
            />
            <Text style={styles.xpText}>
              {nextLevelData
                ? t('progress.xp_to_next', { xp: xpNeeded - xpProgress })
                : '🏆 Nível máximo!'}
            </Text>
          </View>
          <View style={styles.totalXP}>
            <Text style={styles.totalXPNumber}>{profile.total_xp}</Text>
            <Text style={styles.totalXPLabel}>XP Total</Text>
          </View>
        </LinearGradient>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {data?.bodyAreas.reduce((s, a) => s + a.session_count, 0) ?? 0}
            </Text>
            <Text style={styles.statLabel}>{t('progress.total_sessions')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {data?.badges.length ?? 0}
            </Text>
            <Text style={styles.statLabel}>{t('progress.badges')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>{t('progress.streak')}</Text>
          </View>
        </View>

        {/* Body progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('progress.body_progress')}</Text>
          <View style={styles.bodyContainer}>
            <BodyProgressAvatar
              areas={data?.bodyAreas ?? []}
              gender="neutral"
            />
            <View style={styles.areasList}>
              {BODY_AREAS.map((area) => {
                const areaData = data?.bodyAreas.find(a => a.area === area.key);
                const xp = areaData?.total_xp ?? 0;
                const maxXP = 500;
                const pct = Math.min(100, Math.round((xp / maxXP) * 100));
                return (
                  <View key={area.key} style={styles.areaRow}>
                    <Text style={styles.areaIcon}>{area.icon}</Text>
                    <View style={styles.areaInfo}>
                      <View style={styles.areaLabelRow}>
                        <Text style={styles.areaLabel}>{area.label_pt}</Text>
                        <Text style={styles.areaXP}>{xp} XP</Text>
                      </View>
                      <View style={styles.areaBarBg}>
                        <View style={[styles.areaBar, { width: `${pct}%` }]} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Badges */}
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing[8] }} />
        ) : data?.badges && data.badges.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('progress.badges')}</Text>
            <View style={styles.badgesGrid}>
              {data.badges.map((badge: any, i) => (
                <View key={i} style={styles.badgeCard}>
                  <Text style={styles.badgeIcon}>{badge.icon}</Text>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Recent XP */}
        {data?.recentXP && data.recentXP.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>XP Recente</Text>
            {data.recentXP.slice(0, 8).map((log: any, i) => (
              <View key={i} style={styles.xpLogRow}>
                <Text style={styles.xpLogSource}>{log.source}</Text>
                <Text style={styles.xpLogAmount}>+{log.amount} XP</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: Spacing[8] }} />
      </ScrollView>
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
  title: { fontSize: FontSize['2xl'], fontFamily: FontFamily.extrabold, color: Colors.text },
  levelCard: {
    marginHorizontal: Spacing[5],
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    marginBottom: Spacing[4],
    ...Shadow.md,
  },
  levelBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: { fontSize: FontSize['2xl'], fontFamily: FontFamily.extrabold, color: Colors.textInverse },
  levelInfo: { flex: 1, gap: Spacing[1] },
  levelLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.medium, color: 'rgba(255,255,255,0.7)' },
  levelTitle: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.textInverse },
  xpBar: { marginTop: Spacing[1] },
  xpText: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.8)' },
  totalXP: { alignItems: 'center' },
  totalXPNumber: { fontSize: FontSize.xl, fontFamily: FontFamily.extrabold, color: Colors.textInverse },
  totalXPLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.medium, color: 'rgba(255,255,255,0.7)' },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[5],
    gap: Spacing[3],
    marginBottom: Spacing[6],
  },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing[4], alignItems: 'center', ...Shadow.sm,
  },
  statNumber: { fontSize: FontSize.xl, fontFamily: FontFamily.extrabold, color: Colors.text },
  statLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.medium, color: Colors.textSecondary, marginTop: 2 },
  section: {
    paddingHorizontal: Spacing[5],
    marginBottom: Spacing[6],
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bold,
    color: Colors.text,
    marginBottom: Spacing[4],
  },
  bodyContainer: { flexDirection: 'row', gap: Spacing[4], alignItems: 'flex-start' },
  areasList: { flex: 1, gap: Spacing[3] },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  areaIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  areaInfo: { flex: 1, gap: Spacing[1] },
  areaLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  areaLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.medium, color: Colors.text },
  areaXP: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textMuted },
  areaBarBg: {
    height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden',
  },
  areaBar: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  badgesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[3],
  },
  badgeCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing[3], alignItems: 'center', gap: Spacing[1],
    width: 80, ...Shadow.sm,
  },
  badgeIcon: { fontSize: 28 },
  badgeName: { fontSize: FontSize.xs, fontFamily: FontFamily.medium, color: Colors.text, textAlign: 'center' },
  xpLogRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: Spacing[2], borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  xpLogSource: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.text },
  xpLogAmount: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.success },
});
