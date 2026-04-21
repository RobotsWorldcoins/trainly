-- ─────────────────────────────────────────────────────────────────────────────
-- Trainly — Initial Database Schema
-- Migration: 001_initial_schema
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
  'user_free', 'user_plus', 'trainer_pending', 'trainer', 'coach_pro', 'admin'
);

CREATE TYPE session_type AS ENUM ('trainer_led', 'social_group');

CREATE TYPE session_status AS ENUM (
  'draft', 'published', 'cancelled', 'completed', 'in_progress'
);

CREATE TYPE session_category AS ENUM (
  'running', 'cycling', 'yoga', 'calisthenics', 'hiit', 'strength',
  'pilates', 'crossfit', 'mobility', 'swimming', 'martial_arts', 'dance', 'other'
);

CREATE TYPE intensity_level AS ENUM ('low', 'moderate', 'high', 'very_high');
CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced', 'all_levels');

CREATE TYPE body_area AS ENUM (
  'arms', 'chest', 'back', 'core', 'legs', 'cardio', 'mobility', 'full_body'
);

CREATE TYPE participant_status AS ENUM (
  'confirmed', 'cancelled', 'no_show', 'attended', 'refunded'
);

CREATE TYPE payment_status AS ENUM (
  'pending', 'captured', 'released', 'refunded', 'partially_refunded', 'failed', 'cancelled'
);

CREATE TYPE payout_status AS ENUM (
  'pending', 'processing', 'paid', 'failed', 'cancelled'
);

CREATE TYPE refund_reason AS ENUM (
  'user_cancelled_early', 'user_cancelled_late', 'trainer_no_show',
  'session_cancelled', 'admin_exception', 'dispute_resolved'
);

CREATE TYPE trainer_application_status AS ENUM (
  'draft', 'submitted', 'under_review', 'approved', 'rejected', 'more_info_requested'
);

CREATE TYPE trainer_document_type AS ENUM (
  'id_document', 'certification', 'insurance', 'other'
);

CREATE TYPE subscription_plan AS ENUM ('user_plus', 'trainer', 'coach_pro');

CREATE TYPE subscription_status AS ENUM (
  'active', 'cancelled', 'past_due', 'paused', 'trialing', 'expired'
);

CREATE TYPE dispute_status AS ENUM (
  'open', 'under_review', 'resolved_user', 'resolved_trainer', 'closed'
);

CREATE TYPE report_target_type AS ENUM (
  'session', 'user', 'trainer', 'review', 'message'
);

CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'actioned', 'dismissed');

CREATE TYPE curated_location_type AS ENUM (
  'park', 'running_route', 'bike_zone', 'outdoor_gym', 'beach',
  'riverfront', 'senior_friendly_zone', 'group_friendly_space'
);

CREATE TYPE checkin_status AS ENUM (
  'checked_in', 'checked_out', 'validated', 'disputed'
);

CREATE TYPE admin_action_type AS ENUM (
  'approve_trainer', 'reject_trainer', 'suspend_user', 'unsuspend_user',
  'issue_refund', 'resolve_dispute', 'feature_trainer', 'unfeature_trainer',
  'request_documents', 'delete_session', 'dismiss_report'
);

-- ─────────────────────────────────────────────
-- PROFILES
-- extends Supabase auth.users
-- ─────────────────────────────────────────────

CREATE TABLE profiles (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role                        user_role NOT NULL DEFAULT 'user_free',
  display_name                TEXT NOT NULL,
  avatar_url                  TEXT,
  bio                         TEXT,
  city                        TEXT DEFAULT 'Lisboa',
  phone                       TEXT,
  date_of_birth               DATE,
  gender                      TEXT,
  is_senior_friendly          BOOLEAN DEFAULT FALSE,
  is_suspended                BOOLEAN DEFAULT FALSE,
  is_featured                 BOOLEAN DEFAULT FALSE,
  suspension_reason           TEXT,
  suspended_at                TIMESTAMPTZ,
  -- Stripe
  stripe_customer_id          TEXT UNIQUE,
  stripe_connect_account_id   TEXT UNIQUE,
  stripe_connect_onboarded    BOOLEAN DEFAULT FALSE,
  -- User Plus extras
  user_plus_expires_at        TIMESTAMPTZ,
  group_creation_expires_at   TIMESTAMPTZ,
  -- Platform early trainer (commission tracking)
  trainer_since               TIMESTAMPTZ,
  -- Preferences
  preferred_language          TEXT NOT NULL DEFAULT 'pt',
  notification_preferences    JSONB DEFAULT '{}',
  -- Metadata
  total_xp                    INTEGER NOT NULL DEFAULT 0,
  current_level               INTEGER NOT NULL DEFAULT 1,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_is_featured ON profiles(is_featured);

-- ─────────────────────────────────────────────
-- TRAINER SPECIALTIES
-- ─────────────────────────────────────────────

CREATE TABLE trainer_specialties (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category    session_category NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, category)
);

-- ─────────────────────────────────────────────
-- TRAINER APPLICATIONS
-- ─────────────────────────────────────────────

CREATE TABLE trainer_applications (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status                trainer_application_status NOT NULL DEFAULT 'draft',
  -- Personal info
  full_name             TEXT NOT NULL,
  professional_name     TEXT,
  nif                   TEXT,
  iban                  TEXT,
  -- Professional info
  years_experience      INTEGER,
  specialties           session_category[],
  certifications_desc   TEXT,
  insurance_provider    TEXT,
  insurance_policy_num  TEXT,
  insurance_expires_at  DATE,
  -- Declarations
  accepts_trainer_terms     BOOLEAN NOT NULL DEFAULT FALSE,
  accepts_safety_rules      BOOLEAN NOT NULL DEFAULT FALSE,
  declares_autonomous       BOOLEAN NOT NULL DEFAULT FALSE,
  declares_fit_to_train     BOOLEAN NOT NULL DEFAULT FALSE,
  -- Admin tracking
  submitted_at          TIMESTAMPTZ,
  reviewed_at           TIMESTAMPTZ,
  reviewed_by           UUID REFERENCES auth.users(id),
  rejection_reason      TEXT,
  admin_notes           TEXT,
  -- Metadata
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trainer_applications_user_id ON trainer_applications(user_id);
CREATE INDEX idx_trainer_applications_status ON trainer_applications(status);

-- ─────────────────────────────────────────────
-- TRAINER DOCUMENTS
-- ─────────────────────────────────────────────

CREATE TABLE trainer_documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  UUID NOT NULL REFERENCES trainer_applications(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            trainer_document_type NOT NULL,
  file_name       TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  file_size       INTEGER,
  mime_type       TEXT,
  is_verified     BOOLEAN DEFAULT FALSE,
  verified_at     TIMESTAMPTZ,
  verified_by     UUID REFERENCES auth.users(id),
  expires_at      DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trainer_documents_application_id ON trainer_documents(application_id);
CREATE INDEX idx_trainer_documents_user_id ON trainer_documents(user_id);

-- ─────────────────────────────────────────────
-- SUBSCRIPTIONS
-- ─────────────────────────────────────────────

CREATE TABLE subscriptions (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                      subscription_plan NOT NULL,
  status                    subscription_status NOT NULL DEFAULT 'active',
  -- Stripe
  stripe_subscription_id    TEXT UNIQUE,
  stripe_price_id           TEXT,
  stripe_product_id         TEXT,
  -- Dates
  current_period_start      TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ,
  cancelled_at              TIMESTAMPTZ,
  pause_start               TIMESTAMPTZ,
  pause_end                 TIMESTAMPTZ,
  pause_weeks               INTEGER,
  -- Metadata
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ─────────────────────────────────────────────
-- CURATED LOCATIONS
-- ─────────────────────────────────────────────

CREATE TABLE curated_locations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  name_en         TEXT,
  description     TEXT,
  description_en  TEXT,
  type            curated_location_type NOT NULL,
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  city            TEXT NOT NULL DEFAULT 'Lisboa',
  address         TEXT,
  tags            TEXT[],
  is_senior_friendly  BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  image_url       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_curated_locations_type ON curated_locations(type);
CREATE INDEX idx_curated_locations_active ON curated_locations(is_active);

-- ─────────────────────────────────────────────
-- SESSIONS
-- ─────────────────────────────────────────────

CREATE TABLE sessions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type                  session_type NOT NULL,
  title                 TEXT NOT NULL,
  category              session_category NOT NULL,
  description           TEXT,
  body_areas            body_area[] NOT NULL DEFAULT '{}',
  intensity             intensity_level NOT NULL DEFAULT 'moderate',
  skill_level           skill_level NOT NULL DEFAULT 'all_levels',
  is_senior_friendly    BOOLEAN DEFAULT FALSE,
  -- Schedule
  date                  DATE NOT NULL,
  start_time            TIME NOT NULL,
  end_time              TIME NOT NULL,
  -- Location
  location_name         TEXT NOT NULL,
  location_address      TEXT,
  location_lat          DOUBLE PRECISION NOT NULL,
  location_lng          DOUBLE PRECISION NOT NULL,
  curated_location_id   UUID REFERENCES curated_locations(id),
  -- Capacity
  min_participants      INTEGER NOT NULL DEFAULT 1,
  max_participants      INTEGER NOT NULL DEFAULT 10,
  current_participants  INTEGER NOT NULL DEFAULT 0,
  -- Pricing
  price                 NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency              TEXT NOT NULL DEFAULT 'eur',
  -- Status
  status                session_status NOT NULL DEFAULT 'draft',
  -- Boost
  is_boosted            BOOLEAN DEFAULT FALSE,
  boost_expires_at      TIMESTAMPTZ,
  -- Content
  cancellation_policy   TEXT,
  notes                 TEXT,
  materials             TEXT,
  -- Metadata
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_trainer_id ON sessions(trainer_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_sessions_category ON sessions(category);
CREATE INDEX idx_sessions_type ON sessions(type);
CREATE INDEX idx_sessions_location ON sessions USING gist(
  ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326)
);

-- ─────────────────────────────────────────────
-- SESSION PARTICIPANTS
-- ─────────────────────────────────────────────

CREATE TABLE session_participants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id    UUID NOT NULL REFERENCES profiles(id),
  status        participant_status NOT NULL DEFAULT 'confirmed',
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at  TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

CREATE INDEX idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX idx_session_participants_user_id ON session_participants(user_id);
CREATE INDEX idx_session_participants_status ON session_participants(status);

-- ─────────────────────────────────────────────
-- SESSION MESSAGES
-- ─────────────────────────────────────────────

CREATE TABLE session_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_pinned   BOOLEAN DEFAULT FALSE,
  is_deleted  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_session_messages_session_id ON session_messages(session_id);
CREATE INDEX idx_session_messages_created_at ON session_messages(session_id, created_at DESC);

-- ─────────────────────────────────────────────
-- CHECKINS
-- ─────────────────────────────────────────────

CREATE TABLE checkins (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id          UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_id      UUID NOT NULL REFERENCES session_participants(id),
  status              checkin_status NOT NULL DEFAULT 'checked_in',
  -- Check-in
  checkin_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checkin_lat         DOUBLE PRECISION NOT NULL,
  checkin_lng         DOUBLE PRECISION NOT NULL,
  checkin_distance_m  DOUBLE PRECISION,
  -- Check-out
  checkout_at         TIMESTAMPTZ,
  checkout_lat        DOUBLE PRECISION,
  checkout_lng        DOUBLE PRECISION,
  -- Validation
  is_location_valid   BOOLEAN DEFAULT FALSE,
  is_time_valid       BOOLEAN DEFAULT FALSE,
  is_validated        BOOLEAN DEFAULT FALSE,
  validated_at        TIMESTAMPTZ,
  -- Metadata
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

CREATE INDEX idx_checkins_session_id ON checkins(session_id);
CREATE INDEX idx_checkins_user_id ON checkins(user_id);

-- ─────────────────────────────────────────────
-- PAYMENTS
-- ─────────────────────────────────────────────

CREATE TABLE payments (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id                  UUID NOT NULL REFERENCES sessions(id),
  participant_id              UUID NOT NULL REFERENCES session_participants(id),
  payer_id                    UUID NOT NULL REFERENCES auth.users(id),
  trainer_id                  UUID NOT NULL REFERENCES profiles(id),
  -- Amounts in cents
  amount_cents                INTEGER NOT NULL,
  platform_fee_cents          INTEGER NOT NULL,
  trainer_amount_cents        INTEGER NOT NULL,
  currency                    TEXT NOT NULL DEFAULT 'eur',
  -- Stripe
  stripe_payment_intent_id    TEXT UNIQUE,
  stripe_charge_id            TEXT,
  -- Status
  status                      payment_status NOT NULL DEFAULT 'pending',
  captured_at                 TIMESTAMPTZ,
  released_at                 TIMESTAMPTZ,
  -- Commission tracking
  commission_rate             NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  is_early_trainer_rate       BOOLEAN DEFAULT FALSE,
  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_session_id ON payments(session_id);
CREATE INDEX idx_payments_payer_id ON payments(payer_id);
CREATE INDEX idx_payments_trainer_id ON payments(trainer_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ─────────────────────────────────────────────
-- PAYOUTS
-- ─────────────────────────────────────────────

CREATE TABLE payouts (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id            UUID NOT NULL REFERENCES profiles(id),
  session_id            UUID NOT NULL REFERENCES sessions(id),
  payment_id            UUID NOT NULL REFERENCES payments(id),
  amount_cents          INTEGER NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'eur',
  stripe_transfer_id    TEXT UNIQUE,
  status                payout_status NOT NULL DEFAULT 'pending',
  scheduled_for         TIMESTAMPTZ,
  processed_at          TIMESTAMPTZ,
  failure_reason        TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payouts_trainer_id ON payouts(trainer_id);
CREATE INDEX idx_payouts_status ON payouts(status);

-- ─────────────────────────────────────────────
-- REFUNDS
-- ─────────────────────────────────────────────

CREATE TABLE refunds (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id            UUID NOT NULL REFERENCES payments(id),
  user_id               UUID NOT NULL REFERENCES auth.users(id),
  amount_cents          INTEGER NOT NULL,
  reason                refund_reason NOT NULL,
  description           TEXT,
  stripe_refund_id      TEXT UNIQUE,
  status                TEXT NOT NULL DEFAULT 'pending',
  processed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX idx_refunds_user_id ON refunds(user_id);

-- ─────────────────────────────────────────────
-- REVIEWS
-- ─────────────────────────────────────────────

CREATE TABLE reviews (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id            UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  reviewer_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_id        UUID NOT NULL REFERENCES session_participants(id),
  -- Ratings (1-5)
  overall_rating        INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  quality_rating        INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  punctuality_rating    INTEGER CHECK (punctuality_rating BETWEEN 1 AND 5),
  friendliness_rating   INTEGER CHECK (friendliness_rating BETWEEN 1 AND 5),
  accuracy_rating       INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5),
  comment               TEXT,
  is_moderated          BOOLEAN DEFAULT FALSE,
  is_hidden             BOOLEAN DEFAULT FALSE,
  moderation_reason     TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, reviewer_id)
);

CREATE INDEX idx_reviews_trainer_id ON reviews(trainer_id);
CREATE INDEX idx_reviews_session_id ON reviews(session_id);

-- Trainer review summary (materialized for performance)
CREATE TABLE trainer_review_summary (
  trainer_id              UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_reviews           INTEGER NOT NULL DEFAULT 0,
  avg_overall             NUMERIC(3,2) DEFAULT 0,
  avg_quality             NUMERIC(3,2) DEFAULT 0,
  avg_punctuality         NUMERIC(3,2) DEFAULT 0,
  avg_friendliness        NUMERIC(3,2) DEFAULT 0,
  avg_accuracy            NUMERIC(3,2) DEFAULT 0,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- DISPUTES
-- ─────────────────────────────────────────────

CREATE TABLE disputes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES sessions(id),
  raised_by       UUID NOT NULL REFERENCES auth.users(id),
  against         UUID REFERENCES auth.users(id),
  reason          TEXT NOT NULL,
  evidence_urls   TEXT[],
  status          dispute_status NOT NULL DEFAULT 'open',
  admin_notes     TEXT,
  resolved_by     UUID REFERENCES auth.users(id),
  resolved_at     TIMESTAMPTZ,
  resolution      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disputes_session_id ON disputes(session_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- ─────────────────────────────────────────────
-- REPORTS
-- ─────────────────────────────────────────────

CREATE TABLE reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type     report_target_type NOT NULL,
  target_id       UUID NOT NULL,
  reason          TEXT NOT NULL,
  description     TEXT,
  status          report_status NOT NULL DEFAULT 'pending',
  reviewed_by     UUID REFERENCES auth.users(id),
  reviewed_at     TIMESTAMPTZ,
  action_taken    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_target ON reports(target_type, target_id);
CREATE INDEX idx_reports_status ON reports(status);

-- ─────────────────────────────────────────────
-- BADGES
-- ─────────────────────────────────────────────

CREATE TABLE badges (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  name_en       TEXT,
  description   TEXT NOT NULL,
  description_en TEXT,
  icon          TEXT NOT NULL,
  category      TEXT NOT NULL,
  criteria      JSONB NOT NULL DEFAULT '{}',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id    UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);

-- ─────────────────────────────────────────────
-- XP LOGS
-- ─────────────────────────────────────────────

CREATE TABLE xp_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,
  source      TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xp_logs_user_id ON xp_logs(user_id);
CREATE INDEX idx_xp_logs_created_at ON xp_logs(user_id, created_at DESC);

-- ─────────────────────────────────────────────
-- USER PROGRESS — BODY AREAS
-- ─────────────────────────────────────────────

CREATE TABLE user_progress_body_areas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area        body_area NOT NULL,
  total_xp    INTEGER NOT NULL DEFAULT 0,
  session_count INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, area)
);

CREATE INDEX idx_progress_user_id ON user_progress_body_areas(user_id);

-- ─────────────────────────────────────────────
-- ADMIN ACTIONS (AUDIT TRAIL)
-- ─────────────────────────────────────────────

CREATE TABLE admin_actions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id        UUID NOT NULL REFERENCES auth.users(id),
  action_type     admin_action_type NOT NULL,
  target_type     TEXT NOT NULL,
  target_id       UUID NOT NULL,
  reason          TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_target ON admin_actions(target_type, target_id);
CREATE INDEX idx_admin_actions_created_at ON admin_actions(created_at DESC);

-- ─────────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trainer_applications_updated_at BEFORE UPDATE ON trainer_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER payouts_updated_at BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER disputes_updated_at BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER session_participants_updated_at BEFORE UPDATE ON session_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update participant count on session
CREATE OR REPLACE FUNCTION update_session_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    UPDATE sessions SET current_participants = current_participants + 1
    WHERE id = NEW.session_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
      UPDATE sessions SET current_participants = GREATEST(0, current_participants - 1)
      WHERE id = NEW.session_id;
    ELSIF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
      UPDATE sessions SET current_participants = current_participants + 1
      WHERE id = NEW.session_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
    UPDATE sessions SET current_participants = GREATEST(0, current_participants - 1)
    WHERE id = OLD.session_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_participant_count
  AFTER INSERT OR UPDATE OR DELETE ON session_participants
  FOR EACH ROW EXECUTE FUNCTION update_session_participant_count();

-- XP → profile total + level update
CREATE OR REPLACE FUNCTION apply_xp_to_profile()
RETURNS TRIGGER AS $$
DECLARE
  new_total INTEGER;
  new_level INTEGER;
BEGIN
  UPDATE profiles
  SET total_xp = total_xp + NEW.amount
  WHERE user_id = NEW.user_id
  RETURNING total_xp INTO new_total;

  -- Calculate level from XP thresholds
  SELECT COALESCE(MAX(level), 1) INTO new_level
  FROM (VALUES
    (1, 0), (2, 200), (3, 500), (4, 1000),
    (5, 2000), (6, 4000), (7, 7500), (8, 12000)
  ) AS thresholds(level, min_xp)
  WHERE min_xp <= new_total;

  UPDATE profiles SET current_level = new_level
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER xp_apply_trigger
  AFTER INSERT ON xp_logs
  FOR EACH ROW EXECUTE FUNCTION apply_xp_to_profile();

-- Update trainer review summary
CREATE OR REPLACE FUNCTION update_trainer_review_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO trainer_review_summary (trainer_id, total_reviews, avg_overall, avg_quality, avg_punctuality, avg_friendliness, avg_accuracy, updated_at)
  SELECT
    trainer_id,
    COUNT(*),
    ROUND(AVG(overall_rating)::numeric, 2),
    ROUND(AVG(quality_rating)::numeric, 2),
    ROUND(AVG(punctuality_rating)::numeric, 2),
    ROUND(AVG(friendliness_rating)::numeric, 2),
    ROUND(AVG(accuracy_rating)::numeric, 2),
    NOW()
  FROM reviews
  WHERE trainer_id = COALESCE(NEW.trainer_id, OLD.trainer_id)
    AND is_hidden = FALSE
  GROUP BY trainer_id
  ON CONFLICT (trainer_id) DO UPDATE SET
    total_reviews = EXCLUDED.total_reviews,
    avg_overall = EXCLUDED.avg_overall,
    avg_quality = EXCLUDED.avg_quality,
    avg_punctuality = EXCLUDED.avg_punctuality,
    avg_friendliness = EXCLUDED.avg_friendliness,
    avg_accuracy = EXCLUDED.avg_accuracy,
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER review_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_trainer_review_summary();

-- New user → auto-create profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, display_name, preferred_language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'pt')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress_body_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Profiles: public read, own write, admin full
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_own_write" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "profiles_own_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Sessions: published sessions are public, trainers manage their own
CREATE POLICY "sessions_public_read" ON sessions FOR SELECT
  USING (status = 'published' OR trainer_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "sessions_trainer_write" ON sessions FOR INSERT
  WITH CHECK (trainer_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "sessions_trainer_update" ON sessions FOR UPDATE
  USING (trainer_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Participants: users see their own, trainers see their session participants
CREATE POLICY "participants_own_read" ON session_participants FOR SELECT
  USING (
    user_id = auth.uid() OR
    session_id IN (SELECT id FROM sessions WHERE trainer_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
  );
CREATE POLICY "participants_own_insert" ON session_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "participants_own_update" ON session_participants FOR UPDATE
  USING (user_id = auth.uid());

-- Payments: users see their own, trainers see their session payments
CREATE POLICY "payments_own_read" ON payments FOR SELECT
  USING (payer_id = auth.uid() OR trainer_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Reviews: public read, validated participants write
CREATE POLICY "reviews_public_read" ON reviews FOR SELECT USING (is_hidden = FALSE);
CREATE POLICY "reviews_participant_write" ON reviews FOR INSERT
  WITH CHECK (reviewer_id = auth.uid());

-- XP logs: own read
CREATE POLICY "xp_own_read" ON xp_logs FOR SELECT USING (user_id = auth.uid());

-- Body progress: own read
CREATE POLICY "progress_own_read" ON user_progress_body_areas FOR SELECT USING (user_id = auth.uid());

-- Badges: public read
CREATE POLICY "badges_public_read" ON user_badges FOR SELECT USING (TRUE);

-- Trainer applications: own read
CREATE POLICY "applications_own_read" ON trainer_applications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "applications_own_write" ON trainer_applications FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "applications_own_update" ON trainer_applications FOR UPDATE USING (user_id = auth.uid());

-- Trainer documents: own read
CREATE POLICY "documents_own_read" ON trainer_documents FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "documents_own_write" ON trainer_documents FOR INSERT WITH CHECK (user_id = auth.uid());

-- Subscriptions: own read
CREATE POLICY "subscriptions_own_read" ON subscriptions FOR SELECT USING (user_id = auth.uid());

-- Session messages: participants read, participants write
CREATE POLICY "messages_participant_read" ON session_messages FOR SELECT
  USING (
    session_id IN (
      SELECT session_id FROM session_participants WHERE user_id = auth.uid() AND status = 'confirmed'
    ) OR
    session_id IN (SELECT id FROM sessions WHERE trainer_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
  );
CREATE POLICY "messages_participant_write" ON session_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Admin actions: admin only (handled via service role in edge functions)
CREATE POLICY "admin_actions_no_direct_access" ON admin_actions FOR ALL USING (FALSE);

-- ─────────────────────────────────────────────
-- SPATIAL QUERY HELPER
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_sessions_near(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 10,
  session_type_filter session_type DEFAULT NULL,
  category_filter session_category DEFAULT NULL
)
RETURNS TABLE (
  session_id UUID,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    ROUND(
      (ST_DistanceSphere(
        ST_SetSRID(ST_MakePoint(s.location_lng, s.location_lat), 4326),
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)
      ) / 1000)::numeric, 2
    )::DOUBLE PRECISION AS distance_km
  FROM sessions s
  WHERE
    s.status = 'published'
    AND s.date >= CURRENT_DATE
    AND (session_type_filter IS NULL OR s.type = session_type_filter)
    AND (category_filter IS NULL OR s.category = category_filter)
    AND ST_DistanceSphere(
      ST_SetSRID(ST_MakePoint(s.location_lng, s.location_lat), 4326),
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)
    ) <= radius_km * 1000
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql STABLE;
