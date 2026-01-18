-- ============================================
-- MIGRATION: Add Atomic Credit Consumption
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable RLS on credit_transactions (if not already enabled)
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Users can read their own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON credit_transactions;

CREATE POLICY "Users can read their own transactions"
  ON credit_transactions FOR SELECT USING (true);
CREATE POLICY "Users can insert their own transactions"
  ON credit_transactions FOR INSERT WITH CHECK (true);

-- ============================================
-- ATOMIC CREDIT CONSUMPTION FUNCTION
-- ============================================
-- This function atomically checks and consumes credits to prevent race conditions.
-- Uses SELECT ... FOR UPDATE to lock the row during the transaction.

CREATE OR REPLACE FUNCTION consume_credit_atomic(p_email TEXT, p_amount INTEGER DEFAULT 1)
RETURNS TABLE (
  success BOOLEAN,
  credits_before INTEGER,
  credits_after INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_credits_remaining INTEGER;
  v_new_credits INTEGER;
BEGIN
  -- Lock the row and get current credits
  SELECT credits_remaining INTO v_credits_remaining
  FROM user_subscriptions
  WHERE user_email = p_email
  FOR UPDATE;

  -- Check if user exists
  IF v_credits_remaining IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'User subscription not found'::TEXT;
    RETURN;
  END IF;

  -- Check if enough credits
  IF v_credits_remaining < p_amount THEN
    RETURN QUERY SELECT FALSE, v_credits_remaining, v_credits_remaining, 'Insufficient credits'::TEXT;
    RETURN;
  END IF;

  -- Consume the credits
  v_new_credits := v_credits_remaining - p_amount;

  UPDATE user_subscriptions
  SET credits_remaining = v_new_credits,
      updated_at = NOW()
  WHERE user_email = p_email;

  -- Log the transaction
  INSERT INTO credit_transactions (user_email, amount, reason, metadata)
  VALUES (p_email, -p_amount, 'generation', jsonb_build_object('timestamp', NOW()));

  RETURN QUERY SELECT TRUE, v_credits_remaining, v_new_credits, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION consume_credit_atomic(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION consume_credit_atomic(TEXT, INTEGER) TO service_role;

-- Verify the function was created
SELECT proname, proargtypes FROM pg_proc WHERE proname = 'consume_credit_atomic';
