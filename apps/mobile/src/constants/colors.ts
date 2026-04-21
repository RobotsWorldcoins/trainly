// ─────────────────────────────────────────────
// Trainly — Design System Colors
// ─────────────────────────────────────────────

export const Colors = {
  // ── Brand ──────────────────────────────────
  primary: '#1B6FEB',       // Trainly blue
  primaryDark: '#1457C0',
  primaryLight: '#4D91F0',
  accent: '#F5A623',        // Trainly yellow/orange
  accentDark: '#D4880D',
  accentLight: '#FAC05E',

  // ── Background ─────────────────────────────
  background: '#F7F8FC',
  backgroundDark: '#0F1923',
  surface: '#FFFFFF',
  surfaceDark: '#1A2535',
  surfaceElevated: '#FFFFFF',
  surfaceElevatedDark: '#243040',

  // ── Text ────────────────────────────────────
  text: '#1B2A4A',
  textSecondary: '#6B7A99',
  textMuted: '#9BA8C0',
  textInverse: '#FFFFFF',
  textDark: '#E8EDF8',
  textSecondaryDark: '#8A96AD',

  // ── Border ──────────────────────────────────
  border: '#E4E8F0',
  borderDark: '#2E3D52',
  borderFocus: '#1B6FEB',

  // ── Status ──────────────────────────────────
  success: '#22C55E',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // ── Map pins ────────────────────────────────
  pinTrainer: '#1B6FEB',
  pinSocial: '#22C55E',
  pinBoosted: '#F5A623',

  // ── Gamification ────────────────────────────
  xpGold: '#F5A623',
  xpSilver: '#9BA8C0',
  levelBadge: '#1B6FEB',
  streakFire: '#EF4444',

  // ── Role badges ─────────────────────────────
  roleTrainer: '#1B6FEB',
  roleCoachPro: '#7C3AED',
  roleUserPlus: '#F5A623',
  roleAdmin: '#EF4444',

  // ── Transparent ─────────────────────────────
  overlay: 'rgba(0,0,0,0.4)',
  overlayLight: 'rgba(255,255,255,0.9)',
  primaryAlpha10: 'rgba(27,111,235,0.10)',
  primaryAlpha20: 'rgba(27,111,235,0.20)',
} as const;

export type ColorKey = keyof typeof Colors;

// Intensity color mapping
export const IntensityColors = {
  low: '#22C55E',
  moderate: '#F59E0B',
  high: '#EF4444',
  very_high: '#7C3AED',
} as const;

// Category colors
export const CategoryColors: Record<string, string> = {
  running: '#EF4444',
  cycling: '#3B82F6',
  yoga: '#8B5CF6',
  calisthenics: '#F59E0B',
  hiit: '#EF4444',
  strength: '#F97316',
  pilates: '#EC4899',
  crossfit: '#EF4444',
  mobility: '#22C55E',
  swimming: '#0EA5E9',
  martial_arts: '#DC2626',
  dance: '#A855F7',
  other: '#6B7A99',
};
