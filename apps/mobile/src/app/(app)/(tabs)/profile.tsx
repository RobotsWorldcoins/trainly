import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadow } from '@constants/typography';
import { useAuthStore } from '@stores/auth.store';
import { RoleBadge } from '@components/ui/RoleBadge';

interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
  badge?: string;
}

function MenuItem({ icon, label, onPress, danger, badge }: MenuItemProps) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      {badge && (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge}</Text>
        </View>
      )}
      <Text style={styles.menuArrow}>›</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { profile, signOut, effectiveRole, isTrainer } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert(
      'Sair',
      'Tens a certeza que queres sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: signOut },
      ]
    );
  };

  if (!profile) return null;

  const role = effectiveRole();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('profile.title')}</Text>
          <Pressable onPress={() => router.push('/(app)/edit-profile')}>
            <Text style={styles.editButton}>{t('profile.edit_profile')}</Text>
          </Pressable>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                  {profile.display_name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{profile.display_name}</Text>
            <Text style={styles.city}>{profile.city ?? 'Lisboa'}</Text>
            <View style={styles.badgesRow}>
              <RoleBadge role={role} />
            </View>
          </View>
          <View style={styles.statsColumn}>
            <Text style={styles.statNumber}>{profile.total_xp}</Text>
            <Text style={styles.statLabel}>XP</Text>
            <Text style={styles.statNumber}>Lv {profile.current_level}</Text>
          </View>
        </View>

        {/* Trainer CTA */}
        {role === 'user_free' || role === 'user_plus' ? (
          <Pressable
            style={styles.trainerCTA}
            onPress={() => router.push('/(app)/trainer/apply')}
          >
            <Text style={styles.trainerCTAEmoji}>🏋️</Text>
            <View style={styles.trainerCTAInfo}>
              <Text style={styles.trainerCTATitle}>{t('profile.become_trainer')}</Text>
              <Text style={styles.trainerCTADesc}>Cria e monetiza sessões outdoor</Text>
            </View>
            <Text style={styles.trainerCTAArrow}>›</Text>
          </Pressable>
        ) : null}

        {/* Trainer dashboard link */}
        {isTrainer() && (
          <Pressable
            style={styles.dashboardButton}
            onPress={() => router.push('/(app)/trainer/dashboard')}
          >
            <Text style={styles.dashboardButtonText}>
              📊 {t('profile.trainer_dashboard')}
            </Text>
          </Pressable>
        )}

        {/* Menu sections */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Conta</Text>
          <View style={styles.menuGroup}>
            <MenuItem icon="📅" label={t('profile.my_bookings')} onPress={() => router.push('/(app)/(tabs)/sessions')} />
            <MenuItem icon="📈" label={t('progress.title')} onPress={() => router.push('/(app)/(tabs)/progress')} />
            <MenuItem icon="👥" label={t('profile.my_groups')} onPress={() => {}} />
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Planos</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="⭐"
              label={t('profile.upgrade')}
              onPress={() => router.push('/(app)/plans')}
              badge={role === 'user_free' ? 'User Plus €4,99' : undefined}
            />
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Preferências</Text>
          <View style={styles.menuGroup}>
            <MenuItem icon="🌐" label={t('profile.language')} onPress={() => {}} />
            <MenuItem icon="🔔" label={t('profile.notifications')} onPress={() => {}} />
            <MenuItem icon="🔒" label={t('profile.privacy')} onPress={() => {}} />
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Suporte</Text>
          <View style={styles.menuGroup}>
            <MenuItem icon="❓" label={t('profile.help')} onPress={() => {}} />
            <MenuItem icon="📄" label={t('profile.terms')} onPress={() => {}} />
            <MenuItem icon="🛡️" label={t('profile.privacy_policy')} onPress={() => {}} />
          </View>
        </View>

        <View style={styles.menuSection}>
          <View style={styles.menuGroup}>
            <MenuItem icon="🚪" label={t('profile.logout')} onPress={handleSignOut} danger />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerVersion}>Trainly v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing[5], paddingTop: Spacing[4], paddingBottom: Spacing[4],
  },
  title: { fontSize: FontSize['2xl'], fontFamily: FontFamily.extrabold, color: Colors.text },
  editButton: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold, color: Colors.primary },
  profileCard: {
    marginHorizontal: Spacing[5], backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing[5], flexDirection: 'row', alignItems: 'center', gap: Spacing[4],
    marginBottom: Spacing[4], ...Shadow.sm,
  },
  avatarContainer: {},
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: FontSize.xl, fontFamily: FontFamily.bold, color: Colors.textInverse },
  profileInfo: { flex: 1, gap: Spacing[1] },
  displayName: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.text },
  city: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.textSecondary },
  badgesRow: { flexDirection: 'row', gap: Spacing[2], marginTop: Spacing[1] },
  statsColumn: { alignItems: 'center', gap: 2 },
  statNumber: { fontSize: FontSize.base, fontFamily: FontFamily.extrabold, color: Colors.primary },
  statLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.medium, color: Colors.textMuted },
  trainerCTA: {
    marginHorizontal: Spacing[5], backgroundColor: Colors.primaryAlpha10, borderRadius: BorderRadius.lg,
    padding: Spacing[4], flexDirection: 'row', alignItems: 'center', gap: Spacing[3],
    marginBottom: Spacing[4], borderWidth: 1, borderColor: Colors.primaryAlpha20,
  },
  trainerCTAEmoji: { fontSize: 28 },
  trainerCTAInfo: { flex: 1 },
  trainerCTATitle: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.primary },
  trainerCTADesc: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.textSecondary },
  trainerCTAArrow: { fontSize: FontSize.lg, color: Colors.primary },
  dashboardButton: {
    marginHorizontal: Spacing[5], backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    padding: Spacing[4], alignItems: 'center', marginBottom: Spacing[4],
  },
  dashboardButtonText: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.textInverse },
  menuSection: { marginBottom: Spacing[4] },
  menuSectionTitle: {
    fontSize: FontSize.sm, fontFamily: FontFamily.semibold,
    color: Colors.textMuted, paddingHorizontal: Spacing[5], marginBottom: Spacing[2], textTransform: 'uppercase',
  },
  menuGroup: {
    marginHorizontal: Spacing[5], backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadow.sm,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4], gap: Spacing[3],
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  menuIcon: { fontSize: 20, width: 28 },
  menuLabel: { flex: 1, fontSize: FontSize.base, fontFamily: FontFamily.medium, color: Colors.text },
  menuLabelDanger: { color: Colors.error },
  menuBadge: {
    backgroundColor: Colors.accentLight, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing[2], paddingVertical: 2,
  },
  menuBadgeText: { fontSize: FontSize.xs, fontFamily: FontFamily.semibold, color: Colors.accentDark },
  menuArrow: { fontSize: FontSize.lg, color: Colors.textMuted },
  footer: { alignItems: 'center', paddingVertical: Spacing[6] },
  footerVersion: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textMuted },
});
