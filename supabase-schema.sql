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
