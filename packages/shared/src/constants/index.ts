// ─────────────────────────────────────────────
// Trainly — Shared Constants
// ─────────────────────────────────────────────

export const LISBON_COORDS = {
  latitude: 38.7223,
  longitude: -9.1393,
};

export const DEFAULT_RADIUS_KM = 10;
export const RADIUS_OPTIONS = [5, 10, 20, 30] as const;

export const PLATFORM_COMMISSION_DEFAULT = 0.10;
export const PLATFORM_COMMISSION_EARLY = 0.05;
export const PLATFORM_COMMISSION_EARLY_DAYS = 90;

export const CHECKIN_WINDOW_MINUTES_BEFORE = 15;
export const CHECKIN_WINDOW_MINUTES_AFTER = 30;
export const CHECKIN_MAX_DISTANCE_METERS = 200;

export const REFUND_FULL_HOURS_BEFORE = 12;
export const REFUND_PARTIAL_HOURS_BEFORE = 2;
export const REFUND_PARTIAL_PERCENT = 0.5;

export const TRAINER_PLANS = {
  trainer: {
    price_eur: 19,
    sessions_per_week: 2,
    boosts_per_month: 1,
    boost_duration_days: 7,
  },
  coach_pro: {
    price_eur: 39,
    sessions_per_week: 7,
    boosts_per_month: 2,
    boost_duration_days: 7,
  },
} as const;

export const USER_PLUS = {
  price_eur: 4.99,
  group_creation_days: 365,
  premium_extras_days: 30,
} as const;

export const PAUSE_OPTIONS_WEEKS = [1, 2, 3, 4] as const;

export const XP_REWARDS = {
  join_session: 50,
  attend_session: 100,
  leave_review: 25,
  daily_login: 10,
  complete_profile: 50,
  first_session: 150,
  invite_friend: 75,
} as const;

export const LEVEL_THRESHOLDS = [
  { level: 1, min_xp: 0, label: 'Iniciante' },
  { level: 2, min_xp: 200, label: 'Ativo' },
  { level: 3, min_xp: 500, label: 'Dedicado' },
  { level: 4, min_xp: 1000, label: 'Comprometido' },
  { level: 5, min_xp: 2000, label: 'Atleta' },
  { level: 6, min_xp: 4000, label: 'Veterano' },
  { level: 7, min_xp: 7500, label: 'Elite' },
  { level: 8, min_xp: 12000, label: 'Lenda' },
] as const;

export const BODY_AREAS = [
  { key: 'arms', label_pt: 'Braços', label_en: 'Arms', icon: '💪' },
  { key: 'chest', label_pt: 'Peito', label_en: 'Chest', icon: '🫀' },
  { key: 'back', label_pt: 'Costas', label_en: 'Back', icon: '🔙' },
  { key: 'core', label_pt: 'Core', label_en: 'Core', icon: '⭕' },
  { key: 'legs', label_pt: 'Pernas', label_en: 'Legs', icon: '🦵' },
  { key: 'cardio', label_pt: 'Cardio', label_en: 'Cardio', icon: '❤️' },
  { key: 'mobility', label_pt: 'Mobilidade', label_en: 'Mobility', icon: '🤸' },
  { key: 'full_body', label_pt: 'Corpo Todo', label_en: 'Full Body', icon: '🏃' },
] as const;

export const SESSION_CATEGORIES = [
  { key: 'running', label_pt: 'Corrida', label_en: 'Running' },
  { key: 'cycling', label_pt: 'Ciclismo', label_en: 'Cycling' },
  { key: 'yoga', label_pt: 'Yoga', label_en: 'Yoga' },
  { key: 'calisthenics', label_pt: 'Calistenia', label_en: 'Calisthenics' },
  { key: 'hiit', label_pt: 'HIIT', label_en: 'HIIT' },
  { key: 'strength', label_pt: 'Força', label_en: 'Strength' },
  { key: 'pilates', label_pt: 'Pilates', label_en: 'Pilates' },
  { key: 'crossfit', label_pt: 'CrossFit', label_en: 'CrossFit' },
  { key: 'mobility', label_pt: 'Mobilidade', label_en: 'Mobility' },
  { key: 'swimming', label_pt: 'Natação', label_en: 'Swimming' },
  { key: 'martial_arts', label_pt: 'Artes Marciais', label_en: 'Martial Arts' },
  { key: 'dance', label_pt: 'Dança', label_en: 'Dance' },
  { key: 'other', label_pt: 'Outro', label_en: 'Other' },
] as const;
