import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius } from '@constants/typography';
import { UserRole } from '@trainyx/shared';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md';
}

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string; icon: string }> = {
  user_free: { label: 'Utilizador', color: Colors.textSecondary, bg: Colors.border, icon: '👤' },
  user_plus: { label: 'User Plus', color: Colors.accentDark, bg: Colors.accentLight + '60', icon: '⭐' },
  trainer_pending: { label: 'Pendente', color: Colors.warning, bg: Colors.warningLight, icon: '⏳' },
  trainer: { label: 'Treinador', color: '#1457C0', bg: Colors.primaryAlpha10, icon: '✅' },
  coach_pro: { label: 'Coach Pro', color: '#7C3AED', bg: '#F3E8FF', icon: '🏆' },
  admin: { label: 'Admin', color: Colors.error, bg: Colors.errorLight, icon: '🛡️' },
};

export function RoleBadge({ role, size = 'sm' }: RoleBadgeProps) {
  const config = ROLE_CONFIG[role];
  if (!config || role === 'user_free') return null;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, size === 'md' && styles.badgeMd]}>
      <Text style={styles.icon}>{config.icon}</Text>
      <Text style={[styles.label, { color: config.color }, size === 'md' && styles.labelMd]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
  },
  badgeMd: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
  },
  icon: { fontSize: 11 },
  label: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
  },
  labelMd: {
    fontSize: FontSize.sm,
  },
});
