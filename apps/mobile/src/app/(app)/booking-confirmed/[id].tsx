import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius } from '@constants/typography';

export default function BookingConfirmedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <LinearGradient colors={['#1B6FEB', '#0F4FA8']} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>✓</Text>
        </View>
        <Text style={styles.title}>{t('sessions.booking_confirmed')}</Text>
        <Text style={styles.subtitle}>{t('sessions.booking_confirmed_desc')}</Text>

        <View style={styles.tipCard}>
          <Text style={styles.tipEmoji}>📍</Text>
          <Text style={styles.tipText}>
            Não te esqueças de fazer check-in quando chegares ao local da sessão para validar a tua presença.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace(`/(app)/session/${id}`)}
        >
          <Text style={styles.primaryButtonText}>Ver Sessão</Text>
        </Pressable>
        <Pressable
          style={styles.ghostButton}
          onPress={() => router.replace('/(app)/(tabs)/sessions')}
        >
          <Text style={styles.ghostButtonText}>As Minhas Sessões</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: Spacing[8], gap: Spacing[5],
  },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[2],
  },
  icon: { fontSize: 44, color: Colors.textInverse },
  title: {
    fontSize: FontSize['2xl'], fontFamily: FontFamily.extrabold,
    color: Colors.textInverse, textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.base, fontFamily: FontFamily.regular,
    color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: FontSize.base * 1.6,
  },
  tipCard: {
    flexDirection: 'row', gap: Spacing[3],
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.lg,
    padding: Spacing[4], alignItems: 'flex-start',
  },
  tipEmoji: { fontSize: 22 },
  tipText: {
    flex: 1, fontSize: FontSize.sm, fontFamily: FontFamily.regular,
    color: 'rgba(255,255,255,0.9)', lineHeight: FontSize.sm * 1.5,
  },
  actions: {
    paddingHorizontal: Spacing[6], paddingBottom: 48, gap: Spacing[3],
  },
  primaryButton: {
    backgroundColor: Colors.textInverse, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[4], alignItems: 'center',
  },
  primaryButtonText: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.primary },
  ghostButton: {
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: BorderRadius.lg, paddingVertical: Spacing[4], alignItems: 'center',
  },
  ghostButtonText: { fontSize: FontSize.base, fontFamily: FontFamily.semibold, color: Colors.textInverse },
});
