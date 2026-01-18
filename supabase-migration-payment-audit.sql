-- ============================================
-- MIGRATION: Payment Audit Trail
-- Run this in Supabase SQL Editor
-- ============================================

-- Stripe events table for idempotency (if not exists)
CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed', -- 'processed' | 'failed'
  error TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON stripe_events(event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_created_at ON stripe_events(created_at DESC);

-- Payment audit log for compliance and debugging
CREATE TABLE IF NOT EXISTS payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  user_email TEXT,
  amount_cents INTEGER,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL, -- 'success' | 'failed' | 'pending'
  action_taken TEXT, -- 'upgrade_to_pro' | 'add_credits' | 'downgrade' | 'reset_credits'
  metadata JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_audit_user ON payment_audit_log(user_email);
CREATE INDEX IF NOT EXISTS idx_payment_audit_event ON payment_audit_log(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_created ON payment_audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies (admin access only via service role)
DROP POLICY IF EXISTS "Service role access for stripe_events" ON stripe_events;
CREATE POLICY "Service role access for stripe_events"
  ON stripe_events FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role access for payment_audit_log" ON payment_audit_log;
CREATE POLICY "Service role access for payment_audit_log"
  ON payment_audit_log FOR ALL USING (true);

-- Function to log payment audit entries
CREATE OR REPLACE FUNCTION log_payment_audit(
  p_stripe_event_id TEXT,
  p_event_type TEXT,
  p_user_email TEXT,
  p_amount_cents INTEGER,
  p_currency TEXT,
  p_status TEXT,
  p_action_taken TEXT,
  p_metadata JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO payment_audit_log (
    stripe_event_id,
    event_type,
    user_email,
    amount_cents,
    currency,
    status,
    action_taken,
    metadata,
    error_message
  ) VALUES (
    p_stripe_event_id,
    p_event_type,
    p_user_email,
    p_amount_cents,
    p_currency,
    p_status,
    p_action_taken,
    p_metadata,
    p_error_message
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_payment_audit(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, JSONB, TEXT) TO service_role;

-- Verify tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('stripe_events', 'payment_audit_log');
