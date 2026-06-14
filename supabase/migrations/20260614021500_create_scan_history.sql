CREATE TABLE scan_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  image_url TEXT,
  product_name TEXT,
  ingredient_text TEXT,
  analysis_result JSONB NOT NULL DEFAULT '{}',
  safety_score INTEGER DEFAULT 0,
  risk_level TEXT DEFAULT 'safe' CHECK (risk_level IN ('safe', 'moderate', 'caution')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_scans" ON scan_history FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "insert_scans" ON scan_history FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "update_own_scans" ON scan_history FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "delete_own_scans" ON scan_history FOR DELETE
  TO anon, authenticated USING (true);
