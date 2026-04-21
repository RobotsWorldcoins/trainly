import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import { Colors } from '@constants/colors';
import { BorderRadius } from '@constants/typography';

interface XPBarProps {
  current: number;
  max: number;
  style?: ViewStyle;
  color?: string;
}

export function XPBar({ current, max, style, color = Colors.accent }: XPBarProps) {
  const pct = max > 0 ? Math.min(1, current / max) : 0;
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(pct, { duration: 800 });
  }, [pct]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%` as any,
  }));

  return (
    <View style={[styles.bar, style]}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
});
