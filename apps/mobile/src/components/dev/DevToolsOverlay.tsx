import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, ScrollView,
} from 'react-native';
import { useAuthStore } from '@stores/auth.store';
import { supabase } from '@lib/supabase';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius } from '@constants/typography';
import { UserRole } from '@trainyx/shared';

const DEV_ACCOUNTS = [
  { role: 'user_free' as UserRole, email: 'dev.free@trainyx.app', label: '👤 User Free', color: '#6B7A99' },
  { role: 'user_plus' as UserRole, email: 'dev.plus@trainyx.app', label: '⭐ User Plus', color: '#F5A623' },
  { role: 'trainer_pending' as UserRole, email: 'dev.pending@trainyx.app', label: '⏳ Trainer Pending', color: '#F59E0B' },
  { role: 'trainer' as UserRole, email: 'dev.trainer@trainyx.app', label: '✅ Trainer', color: '#1B6FEB' },
  { role: 'coach_pro' as UserRole, email: 'dev.coach@trainyx.app', label: '🏆 Coach Pro', color: '#7C3AED' },
  { role: 'admin' as UserRole, email: 'dev.admin@trainyx.app', label: '🛡️ Admin', color: '#EF4444' },
] as const;

const DEV_PASSWORD = 'TrainyX2024!';

export function DevToolsOverlay() {
  const [expanded, setExpanded] = useState(false);
  const { effectiveRole, setDevRoleOverride, devRoleOverride, session, signOut } = useAuthStore();

  const handleQuickLogin = async (email: string) => {
    await supabase.auth.signInWithPassword({ email, password: DEV_PASSWORD });
    setExpanded(false);
  };

  const handleRoleOverride = (role: UserRole) => {
    setDevRoleOverride(devRoleOverride === role ? null : role);
    setExpanded(false);
  };

  const currentRole = effectiveRole();

  return (
    <>
      {/* Floating badge */}
      <Pressable
        style={styles.badge}
        onPress={() => setExpanded(true)}
        onLongPress={() => setDevRoleOverride(null)}
      >
        <Text style={styles.badgeText}>
          DEV{devRoleOverride ? ` [${devRoleOverride.split('_').pop()}]` : ''}
        </Text>
      </Pressable>

      {/* Dev panel modal */}
      <Modal
        visible={expanded}
        transparent
        animationType="fade"
        onRequestClose={() => setExpanded(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setExpanded(false)} />
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>🛠 Dev Tools</Text>
          <Text style={styles.currentRole}>Papel atual: {currentRole}</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            <Text style={styles.sectionLabel}>Login Rápido</Text>
            {DEV_ACCOUNTS.map((acc) => (
              <Pressable
                key={acc.role}
                style={[styles.accountButton, { borderLeftColor: acc.color }]}
                onPress={() => handleQuickLogin(acc.email)}
              >
                <Text style={styles.accountLabel}>{acc.label}</Text>
                <Text style={styles.accountEmail}>{acc.email}</Text>
              </Pressable>
            ))}

            <Text style={styles.sectionLabel}>Simular Papel (sem relogin)</Text>
            {DEV_ACCOUNTS.map((acc) => (
              <Pressable
                key={acc.role}
                style={[
                  styles.overrideButton,
                  devRoleOverride === acc.role && styles.overrideButtonActive,
                ]}
                onPress={() => handleRoleOverride(acc.role)}
              >
                <Text style={styles.overrideLabel}>{acc.label}</Text>
                {devRoleOverride === acc.role && (
                  <Text style={styles.activeCheck}>✓ ATIVO</Text>
                )}
              </Pressable>
            ))}

            {session && (
              <>
                <Text style={styles.sectionLabel}>Ações</Text>
                <Pressable style={styles.dangerButton} onPress={signOut}>
                  <Text style={styles.dangerText}>🚪 Sair</Text>
                </Pressable>
              </>
            )}
          </ScrollView>

          <Pressable style={styles.closeButton} onPress={() => setExpanded(false)}>
            <Text style={styles.closeText}>Fechar</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    backgroundColor: '#FF3B30',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    zIndex: 9999,
    opacity: 0.85,
  },
  badgeText: { fontSize: 10, fontFamily: FontFamily.bold, color: '#FFF' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.overlay },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surfaceDark,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing[5],
    maxHeight: '80%',
  },
  panelTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.extrabold,
    color: Colors.textDark,
    marginBottom: Spacing[1],
  },
  currentRole: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: Colors.textSecondaryDark,
    marginBottom: Spacing[4],
  },
  scroll: { maxHeight: 400 },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: Colors.textSecondaryDark,
    textTransform: 'uppercase',
    marginTop: Spacing[4],
    marginBottom: Spacing[2],
  },
  accountButton: {
    backgroundColor: Colors.surfaceElevatedDark,
    borderRadius: BorderRadius.md,
    padding: Spacing[3],
    marginBottom: Spacing[2],
    borderLeftWidth: 3,
  },
  accountLabel: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.textDark },
  accountEmail: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textSecondaryDark, marginTop: 2 },
  overrideButton: {
    backgroundColor: Colors.surfaceElevatedDark,
    borderRadius: BorderRadius.md,
    padding: Spacing[3],
    marginBottom: Spacing[2],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overrideButtonActive: { borderWidth: 1, borderColor: Colors.accent },
  overrideLabel: { fontSize: FontSize.base, fontFamily: FontFamily.medium, color: Colors.textDark },
  activeCheck: { fontSize: FontSize.xs, fontFamily: FontFamily.bold, color: Colors.accent },
  dangerButton: {
    backgroundColor: '#7F1D1D',
    borderRadius: BorderRadius.md,
    padding: Spacing[3],
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  dangerText: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: '#FCA5A5' },
  closeButton: {
    marginTop: Spacing[4],
    backgroundColor: Colors.surfaceElevatedDark,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    alignItems: 'center',
  },
  closeText: { fontSize: FontSize.base, fontFamily: FontFamily.semibold, color: Colors.textDark },
});
