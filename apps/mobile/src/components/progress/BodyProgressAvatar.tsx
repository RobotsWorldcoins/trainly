import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';
import { Colors } from '@constants/colors';

interface BodyArea {
  area: string;
  total_xp: number;
}

interface BodyProgressAvatarProps {
  areas: BodyArea[];
  gender?: 'male' | 'female' | 'neutral';
  size?: number;
}

function getAreaColor(xp: number): string {
  if (xp === 0) return '#E4E8F0';
  if (xp < 100) return '#93C5FD';
  if (xp < 250) return '#3B82F6';
  if (xp < 500) return '#1B6FEB';
  return '#F5A623';
}

export function BodyProgressAvatar({ areas, size = 120 }: BodyProgressAvatarProps) {
  const get = (areaKey: string) => {
    const a = areas.find(x => x.area === areaKey);
    return getAreaColor(a?.total_xp ?? 0);
  };

  return (
    <View style={[styles.container, { width: size, height: size * 1.8 }]}>
      <Svg width={size} height={size * 1.8} viewBox="0 0 60 108">
        {/* Head */}
        <Circle cx="30" cy="10" r="9" fill={Colors.border} />

        {/* Neck */}
        <Path d="M26 18 L34 18 L33 24 L27 24 Z" fill={Colors.border} />

        {/* Chest */}
        <Path d="M18 24 L42 24 L44 44 L16 44 Z" fill={get('chest')} rx="3" />

        {/* Arms */}
        <Path d="M16 24 L10 24 L8 44 L14 44 Z" fill={get('arms')} />
        <Path d="M44 24 L50 24 L52 44 L46 44 Z" fill={get('arms')} />

        {/* Forearms */}
        <Path d="M8 44 L6 62 L12 62 L14 44 Z" fill={get('arms')} opacity="0.8" />
        <Path d="M52 44 L54 62 L48 62 L46 44 Z" fill={get('arms')} opacity="0.8" />

        {/* Core */}
        <Path d="M18 44 L42 44 L40 60 L20 60 Z" fill={get('core')} />

        {/* Back indicator (uses back color subtly) */}

        {/* Legs */}
        <Path d="M20 60 L28 60 L26 80 L18 80 Z" fill={get('legs')} />
        <Path d="M32 60 L40 60 L42 80 L34 80 Z" fill={get('legs')} />

        {/* Lower legs */}
        <Path d="M18 80 L26 80 L24 96 L16 96 Z" fill={get('legs')} opacity="0.85" />
        <Path d="M34 80 L42 80 L44 96 L36 96 Z" fill={get('legs')} opacity="0.85" />

        {/* Feet */}
        <Ellipse cx="20" cy="98" rx="6" ry="3" fill={Colors.border} />
        <Ellipse cx="40" cy="98" rx="6" ry="3" fill={Colors.border} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
  },
});
