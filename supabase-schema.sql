-- Create dj_sets table to store user's saved DJ sets
CREATE TABLE IF NOT EXISTS dj_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  set_id TEXT NOT NULL, -- The client-side generated ID (e.g., "set-1705123456789")
  name TEXT NOT NULL,
  data JSONB NOT NULL, -- The entire Set object
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_email, set_id)
);

-- Create index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_dj_sets_user_email ON dj_sets(user_email);

-- Create index for faster queries by created_at (for sorting)
CREATE INDEX IF NOT EXISTS idx_dj_sets_created_at ON dj_sets(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE dj_sets ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own sets
CREATE POLICY "Users can read their own sets"
  ON dj_sets
  FOR SELECT
  USING (true); -- We'll check user_email in the API layer

-- Create policy to allow users to insert their own sets
CREATE POLICY "Users can insert their own sets"
  ON dj_sets
  FOR INSERT
  WITH CHECK (true); -- We'll check user_email in the API layer

-- Create policy to allow users to update their own sets
CREATE POLICY "Users can update their own sets"
  ON dj_sets
  FOR UPDATE
  USING (true); -- We'll check user_email in the API layer

-- Create policy to allow users to delete their own sets
CREATE POLICY "Users can delete their own sets"
  ON dj_sets
  FOR DELETE
  USING (true); -- We'll check user_email in the API layer

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to call the function
CREATE TRIGGER update_dj_sets_updated_at
  BEFORE UPDATE ON dj_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SUBSCRIPTION & CREDITS TABLES
-- ============================================

-- User subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free', -- 'free' | 'pro'
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  credits_remaining INTEGER NOT NULL DEFAULT 5,
  credits_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_email ON user_subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe ON user_subscriptions(stripe_customer_id);

-- Enable RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies (security enforced at API layer)
CREATE POLICY "Users can read their own subscription"
  ON user_subscriptions FOR SELECT USING (true);
CREATE POLICY "Users can insert their own subscription"
  ON user_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own subscription"
  ON user_subscriptions FOR UPDATE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Credit transactions table (audit log)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  amount INTEGER NOT NULL, -- positive = add, negative = spend
  reason TEXT NOT NULL, -- 'generation', 'monthly_reset', 'purchase', 'bonus'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for credit_transactions
CREATE INDEX IF NOT EXISTS idx_credit_transactions_email ON credit_transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
