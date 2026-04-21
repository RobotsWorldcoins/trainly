// ─────────────────────────────────────────────
// Trainly — Shared Types
// Used by both mobile app and admin dashboard
// ─────────────────────────────────────────────

// ── Roles ────────────────────────────────────
export type UserRole =
  | 'user_free'
  | 'user_plus'
  | 'trainer_pending'
  | 'trainer'
  | 'coach_pro'
  | 'admin';

// ── Session Types ─────────────────────────────
export type SessionType = 'trainer_led' | 'social_group';

export type SessionStatus =
  | 'draft'
  | 'published'
  | 'cancelled'
  | 'completed'
  | 'in_progress';

export type SessionCategory =
  | 'running'
  | 'cycling'
  | 'yoga'
  | 'calisthenics'
  | 'hiit'
  | 'strength'
  | 'pilates'
  | 'crossfit'
  | 'mobility'
  | 'swimming'
  | 'martial_arts'
  | 'dance'
  | 'other';

export type IntensityLevel = 'low' | 'moderate' | 'high' | 'very_high';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels';

// ── Body Areas ────────────────────────────────
export type BodyArea =
  | 'arms'
  | 'chest'
  | 'back'
  | 'core'
  | 'legs'
  | 'cardio'
  | 'mobility'
  | 'full_body';

// ── Participant Status ────────────────────────
export type ParticipantStatus =
  | 'confirmed'
  | 'cancelled'
  | 'no_show'
  | 'attended'
  | 'refunded';

// ── Payment ──────────────────────────────────
export type PaymentStatus =
  | 'pending'
  | 'captured'
  | 'released'
  | 'refunded'
  | 'partially_refunded'
  | 'failed'
  | 'cancelled';

export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';

export type RefundReason =
  | 'user_cancelled_early'
  | 'user_cancelled_late'
  | 'trainer_no_show'
  | 'session_cancelled'
  | 'admin_exception'
  | 'dispute_resolved';

// ── Trainer Application ───────────────────────
export type TrainerApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'more_info_requested';

export type TrainerDocumentType =
  | 'id_document'
  | 'certification'
  | 'insurance'
  | 'other';

// ── Subscription ─────────────────────────────
export type SubscriptionPlan = 'user_plus' | 'trainer' | 'coach_pro';
export type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'past_due'
  | 'paused'
  | 'trialing'
  | 'expired';

// ── Dispute ──────────────────────────────────
export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'resolved_user'
  | 'resolved_trainer'
  | 'closed';

// ── Report ───────────────────────────────────
export type ReportTargetType = 'session' | 'user' | 'trainer' | 'review' | 'message';
export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';

// ── Curated Location ─────────────────────────
export type CuratedLocationType =
  | 'park'
  | 'running_route'
  | 'bike_zone'
  | 'outdoor_gym'
  | 'beach'
  | 'riverfront'
  | 'senior_friendly_zone'
  | 'group_friendly_space';

// ── Checkin ──────────────────────────────────
export type CheckinStatus = 'checked_in' | 'checked_out' | 'validated' | 'disputed';

// ── Admin Actions ─────────────────────────────
export type AdminActionType =
  | 'approve_trainer'
  | 'reject_trainer'
  | 'suspend_user'
  | 'unsuspend_user'
  | 'issue_refund'
  | 'resolve_dispute'
  | 'feature_trainer'
  | 'unfeature_trainer'
  | 'request_documents'
  | 'delete_session'
  | 'dismiss_report';

// ── Profile ──────────────────────────────────
export interface Profile {
  id: string;
  user_id: string;
  role: UserRole;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  is_senior_friendly: boolean;
  is_suspended: boolean;
  is_featured: boolean;
  stripe_customer_id: string | null;
  stripe_connect_account_id: string | null;
  user_plus_expires_at: string | null;
  group_creation_expires_at: string | null;
  preferred_language: 'pt' | 'en';
  created_at: string;
  updated_at: string;
}

// ── Session ──────────────────────────────────
export interface Session {
  id: string;
  trainer_id: string;
  type: SessionType;
  title: string;
  category: SessionCategory;
  description: string;
  body_areas: BodyArea[];
  intensity: IntensityLevel;
  skill_level: SkillLevel;
  is_senior_friendly: boolean;
  date: string;
  start_time: string;
  end_time: string;
  location_name: string;
  location_address: string | null;
  location_lat: number;
  location_lng: number;
  min_participants: number;
  max_participants: number;
  current_participants: number;
  price: number;
  currency: string;
  status: SessionStatus;
  cancellation_policy: string | null;
  notes: string | null;
  is_boosted: boolean;
  boost_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Coordinates ───────────────────────────────
export interface Coordinates {
  latitude: number;
  longitude: number;
}

// ── Map Filter ────────────────────────────────
export interface MapFilters {
  radius_km: 5 | 10 | 20 | 30;
  category?: SessionCategory;
  session_type?: SessionType;
  intensity?: IntensityLevel;
  skill_level?: SkillLevel;
  is_senior_friendly?: boolean;
  date?: string;
  price_max?: number;
  mobility?: 'walking' | 'car' | 'bicycle';
}

// ── Pagination ────────────────────────────────
export interface PaginationParams {
  page: number;
  per_page: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}
