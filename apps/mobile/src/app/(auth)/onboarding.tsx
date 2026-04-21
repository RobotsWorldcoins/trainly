import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions, Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius } from '@constants/typography';

const { width } = Dimensions.get('window');

const STEPS = [
  {
    emoji: '🗺️',
    titleKey: 'onboarding.step1_title',
    descKey: 'onboarding.step1_desc',
    gradient: ['#1B6FEB', '#0F4FA8'] as const,
  },
  {
    emoji: '👥',
    titleKey: 'onboarding.step2_title',
    descKey: 'onboarding.step2_desc',
    gradient: ['#22C55E', '#15803D'] as const,
  },
  {
    emoji: '📈',
    titleKey: 'onboarding.step3_title',
    descKey: 'onboarding.step3_desc',
    gradient: ['#F5A623', '#D4880D'] as const,
  },
  {
    emoji: '📍',
    titleKey: 'onboarding.location_title',
    descKey: 'onboarding.location_desc',
    gradient: ['#7C3AED', '#5B21B6'] as const,
    isLocation: true,
  },
];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  const handleLocationRequest = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Localização',
        'Podes ativar a localização mais tarde nas definições.',
        [{ text: 'OK', onPress: finishOnboarding }]
      );
    } else {
      finishOnboarding();
    }
  };

  const finishOnboarding = () => {
    router.replace('/(app)/(tabs)');
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else if (current.isLocation) {
      handleLocationRequest();
    } else {
      finishOnboarding();
    }
  };

  return (
    <LinearGradient
      colors={current.gradient}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Skip */}
      <Pressable style={styles.skipButton} onPress={finishOnboarding}>
        <Text style={styles.skipText}>{t('common.skip')}</Text>
      </Pressable>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.emoji}>{current.emoji}</Text>
        <Text style={styles.title}>{t(current.titleKey)}</Text>
        <Text style={styles.desc}>{t(current.descKey)}</Text>
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === step && styles.dotActive]}
          />
        ))}
      </View>

      {/* Action */}
      <View style={styles.actions}>
        {current.isLocation ? (
          <>
            <Pressable style={styles.primaryButton} onPress={handleLocationRequest}>
              <Text style={styles.primaryButtonText}>
                {t('onboarding.location_allow')}
              </Text>
            </Pressable>
            <Pressable style={styles.ghostButton} onPress={finishOnboarding}>
              <Text style={styles.ghostButtonText}>{t('onboarding.location_later')}</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.primaryButton} onPress={handleNext}>
            <Text style={styles.primaryButtonText}>
              {step < STEPS.length - 2 ? t('common.next') : t('common.next')}
            </Text>
          </Pressable>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipButton: {
    position: 'absolute', top: 56, right: Spacing[5],
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[2], zIndex: 10,
  },
  skipText: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold, color: 'rgba(255,255,255,0.7)' },
  content: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: Spacing[8], gap: Spacing[5],
  },
  emoji: { fontSize: 80 },
  title: {
    fontSize: FontSize['2xl'], fontFamily: FontFamily.extrabold,
    color: Colors.textInverse, textAlign: 'center',
  },
  desc: {
    fontSize: FontSize.md, fontFamily: FontFamily.regular,
    color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: FontSize.md * 1.6,
  },
  dots: {
    flexDirection: 'row', justifyContent: 'center', gap: Spacing[2], marginBottom: Spacing[8],
  },
  dot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    width: 24, backgroundColor: Colors.textInverse,
  },
  actions: {
    paddingHorizontal: Spacing[6], paddingBottom: 48, gap: Spacing[3],
  },
  primaryButton: {
    backgroundColor: Colors.textInverse, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[4], alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.primary,
  },
  ghostButton: {
    borderRadius: BorderRadius.lg, paddingVertical: Spacing[3], alignItems: 'center',
  },
  ghostButtonText: {
    fontSize: FontSize.base, fontFamily: FontFamily.medium, color: 'rgba(255,255,255,0.7)',
  },
});
