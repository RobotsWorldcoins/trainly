import React from 'react';
import {
  View, Text, StyleSheet, Image, Pressable, Dimensions, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius } from '@constants/typography';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background gradient */}
      <LinearGradient
        colors={['#1B2A4A', '#1B6FEB', '#0F4FA8']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />

      {/* Decorative circles */}
      <View style={[styles.circle, styles.circle1]} />
      <View style={[styles.circle, styles.circle2]} />

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('@assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{t('auth.welcome_title')}</Text>
        <Text style={styles.subtitle}>{t('auth.welcome_subtitle')}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Text style={styles.primaryButtonText}>{t('auth.sign_up')}</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.secondaryButtonText}>{t('auth.sign_in')}</Text>
        </Pressable>

        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            {t('auth.terms_agree')}{' '}
            <Text style={styles.termsLink}>{t('auth.terms_link')}</Text>
            {' '}{t('auth.and')}{' '}
            <Text style={styles.termsLink}>{t('auth.privacy_link')}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  circle1: {
    width: 300,
    height: 300,
    top: -80,
    right: -80,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: 200,
    left: -60,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  logo: {
    width: 160,
    height: 160,
  },
  content: {
    paddingHorizontal: Spacing[6],
    marginBottom: Spacing[8],
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize['3xl'],
    fontFamily: FontFamily.extrabold,
    color: Colors.textInverse,
    textAlign: 'center',
    marginBottom: Spacing[3],
    lineHeight: FontSize['3xl'] * 1.2,
  },
  subtitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.regular,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: FontSize.md * 1.6,
  },
  actions: {
    paddingHorizontal: Spacing[6],
    paddingBottom: 48,
    gap: Spacing[3],
  },
  primaryButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[4],
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bold,
    color: Colors.textInverse,
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[4],
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.semibold,
    color: Colors.textInverse,
  },
  termsContainer: {
    alignItems: 'center',
    marginTop: Spacing[2],
  },
  termsText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: FontSize.xs * 1.6,
  },
  termsLink: {
    color: 'rgba(255,255,255,0.8)',
    textDecorationLine: 'underline',
  },
});
