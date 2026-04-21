import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { supabase } from '@lib/supabase';
import { useCheckin } from '@hooks/useCheckin';
import { useAuthStore } from '@stores/auth.store';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadow } from '@constants/typography';

async function fetchCheckinSession(id: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, title, date, start_time, end_time, location_name, location_lat, location_lng, status')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

async function fetchParticipantCheckin(sessionId: string, userId: string) {
  const { data } = await supabase
    .from('checkins')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

export default function CheckinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { performCheckin, performCheckout, isLoading, result, error } = useCheckin(id);
  const [checkinRecord, setCheckinRecord] = useState<any>(null);
  const [phase, setPhase] = useState<'idle' | 'success' | 'error'>('idle');

  const { data: session } = useQuery({
    queryKey: ['checkin-session', id],
    queryFn: () => fetchCheckinSession(id),
  });

  useEffect(() => {
    if (user) {
      fetchParticipantCheckin(id, user.id).then(setCheckinRecord);
    }
  }, [id, user]);

  const handleCheckin = async () => {
    const res = await performCheckin();
    if (res) {
      Haptics.notificationAsync(
        res.is_validated
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
      setPhase(res.success ? 'success' : 'error');
      if (res.success) {
        fetchParticipantCheckin(id, user!.id).then(setCheckinRecord);
      }
    } else {
      setPhase('error');
    }
  };

  const handleCheckout = async () => {
    Alert.alert(
      'Confirmar saída',
      'Tens a certeza que queres fazer check-out desta sessão?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            const res = await performCheckout();
            if (res) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Check-out realizado!', 'Obrigado pela tua participação.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            }
          },
        },
      ]
    );
  };

  const hasCheckedIn = !!checkinRecord?.checkin_time;
  const hasCheckedOut = !!checkinRecord?.checkout_time;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Check-in</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {session && (
          <View style={styles.sessionCard}>
            <Text style={styles.sessionTitle}>{session.title}</Text>
            <Text style={styles.sessionMeta}>📍 {session.location_name}</Text>
            <Text style={styles.sessionMeta}>
              🕐 {session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}
            </Text>
          </View>
        )}

        {/* Status display */}
        {phase === 'idle' && !hasCheckedIn && (
          <View style={styles.statusContainer}>
            <View style={styles.pulseCircle}>
              <Text style={styles.pulseIcon}>📍</Text>
            </View>
            <Text style={styles.statusTitle}>Pronto para fazer check-in?</Text>
            <Text style={styles.statusText}>
              Precisas de estar a menos de 200m do local da sessão e dentro da janela horária.
            </Text>
          </View>
        )}

        {phase === 'success' && result && (
          <View style={styles.statusContainer}>
            <View style={[styles.pulseCircle, result.is_validated ? styles.pulseSuccess : styles.pulseWarning]}>
              <Text style={styles.pulseIcon}>{result.is_validated ? '✓' : '⚠️'}</Text>
            </View>
            <Text style={styles.statusTitle}>
              {result.is_validated ? 'Check-in validado!' : 'Check-in registado'}
            </Text>
            <Text style={styles.statusText}>{result.message}</Text>

            <View style={styles.detailsCard}>
              <DetailRow
                icon={result.is_location_valid ? '✅' : '❌'}
                label="Localização"
                value={`${Math.round(result.distance_meters)}m do local`}
              />
              <DetailRow
                icon={result.is_time_valid ? '✅' : '❌'}
                label="Horário"
                value={result.is_time_valid ? 'Dentro da janela' : 'Fora da janela'}
              />
            </View>
          </View>
        )}

        {phase === 'error' && (
          <View style={styles.statusContainer}>
            <View style={[styles.pulseCircle, styles.pulseError]}>
              <Text style={styles.pulseIcon}>✕</Text>
            </View>
            <Text style={styles.statusTitle}>Não foi possível fazer check-in</Text>
            <Text style={styles.statusText}>{error || 'Ocorreu um erro. Tenta novamente.'}</Text>
          </View>
        )}

        {hasCheckedIn && phase === 'idle' && (
          <View style={styles.statusContainer}>
            <View style={[styles.pulseCircle, styles.pulseSuccess]}>
              <Text style={styles.pulseIcon}>✓</Text>
            </View>
            <Text style={styles.statusTitle}>Já fizeste check-in</Text>
            <Text style={styles.statusText}>
              Check-in às {checkinRecord.checkin_time ? new Date(checkinRecord.checkin_time).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '—'}
            </Text>
            {checkinRecord.is_validated && (
              <View style={styles.validatedBadge}>
                <Text style={styles.validatedBadgeText}>✓ Presença validada</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.bottomBar}>
        {!hasCheckedIn ? (
          <Pressable
            style={[styles.actionBtn, styles.checkinBtn, isLoading && styles.actionBtnDisabled]}
            onPress={handleCheckin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <>
                <Text style={styles.actionBtnIcon}>📍</Text>
                <Text style={styles.actionBtnText}>Fazer check-in</Text>
              </>
            )}
          </Pressable>
        ) : !hasCheckedOut ? (
          <Pressable
            style={[styles.actionBtn, styles.checkoutBtn, isLoading && styles.actionBtnDisabled]}
            onPress={handleCheckout}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <>
                <Text style={styles.actionBtnIcon}>🏁</Text>
                <Text style={styles.actionBtnText}>Fazer check-out</Text>
              </>
            )}
          </Pressable>
        ) : (
          <View style={styles.completedBar}>
            <Text style={styles.completedText}>✓ Sessão concluída</Text>
          </View>
        )}

        {phase !== 'idle' && (
          <Pressable style={styles.retryBtn} onPress={() => setPhase('idle')}>
            <Text style={styles.retryBtnText}>Tentar novamente</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing[5], paddingVertical: Spacing[4],
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: FontSize.xl, color: Colors.text },
  headerTitle: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.text },
  content: { flex: 1, padding: Spacing[5], gap: Spacing[5] },
  sessionCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing[5], ...Shadow.sm, gap: Spacing[2],
  },
  sessionTitle: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.text },
  sessionMeta: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.textSecondary },
  statusContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing[4] },
  pulseCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  pulseSuccess: { backgroundColor: '#DCFCE7' },
  pulseWarning: { backgroundColor: '#FEF3C7' },
  pulseError: { backgroundColor: '#FEE2E2' },
  pulseIcon: { fontSize: 44 },
  statusTitle: { fontSize: FontSize.xl, fontFamily: FontFamily.bold, color: Colors.text, textAlign: 'center' },
  statusText: {
    fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: FontSize.base * 1.6, paddingHorizontal: Spacing[4],
  },
  detailsCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing[4], ...Shadow.sm, gap: Spacing[3], width: '100%',
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  detailIcon: { fontSize: 18, width: 24 },
  detailLabel: { flex: 1, fontSize: FontSize.sm, fontFamily: FontFamily.medium, color: Colors.text },
  detailValue: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold, color: Colors.textSecondary },
  validatedBadge: {
    backgroundColor: '#DCFCE7', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[2],
  },
  validatedBadgeText: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold, color: '#15803D' },
  bottomBar: {
    paddingHorizontal: Spacing[5], paddingBottom: 34, paddingTop: Spacing[4],
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    gap: Spacing[3],
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: BorderRadius.lg, paddingVertical: Spacing[4], gap: Spacing[2],
  },
  checkinBtn: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  checkoutBtn: { backgroundColor: Colors.warning },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnIcon: { fontSize: 22 },
  actionBtnText: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.textInverse },
  completedBar: {
    backgroundColor: Colors.successLight, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[4], alignItems: 'center',
  },
  completedText: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.success },
  retryBtn: {
    borderRadius: BorderRadius.lg, paddingVertical: Spacing[3],
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  retryBtnText: { fontSize: FontSize.base, fontFamily: FontFamily.semibold, color: Colors.textSecondary },
});
