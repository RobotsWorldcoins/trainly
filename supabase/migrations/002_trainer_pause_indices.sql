-- Migration 002: Trainer pause mode, additional indices, missing columns

-- Add missing columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS trainer_paused_until TIMESTAMPTZ;

-- Trainer pause mode
CREATE TABLE IF NOT EXISTS trainer_pauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  paused_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resume_at TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns to disputes
ALTER TABLE disputes
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS resolution TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES profiles(id);

-- Add missing columns to reports
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Add missing columns to admin_actions
ALTER TABLE admin_actions
  ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add missing columns to payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS participant_id UUID REFERENCES session_participants(id);

-- Add missing columns to payouts
ALTER TABLE payouts
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_sessions_trainer_id ON sessions(trainer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_category ON sessions(category);
CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user_id ON session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_status ON session_participants(status);
CREATE INDEX IF NOT EXISTS idx_checkins_session_id ON checkins(session_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_session_id ON payments(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_trainer_id ON payments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payouts_trainer_id ON payouts(trainer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_trainer_id ON reviews(trainer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_session_id ON reviews(session_id);
CREATE INDEX IF NOT EXISTS idx_xp_logs_user_id ON xp_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);

-- RLS for new tables
ALTER TABLE trainer_pauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainers_own_pauses" ON trainer_pauses
  FOR ALL USING (trainer_id = auth.uid());

CREATE POLICY "admin_all_pauses" ON trainer_pauses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Suspended users cannot read paid content
CREATE OR REPLACE FUNCTION is_user_suspended(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_suspended, false) FROM profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
