-- Supabase/PostgreSQL Schema for ZeaWatch

-- Create analyses table
CREATE TABLE IF NOT EXISTS analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    disease VARCHAR(100) NOT NULL,
    confidence DECIMAL(5, 4) NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);

-- Enable Row Level Security (optional, for Supabase)
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth needs)
CREATE POLICY "Allow all operations" ON analyses
    FOR ALL
    USING (true)
    WITH CHECK (true);

