-- Supabase/PostgreSQL Schema for ZeaWatch

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    location TEXT,
    subscription_tier TEXT DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analyses table with user_id
CREATE TABLE IF NOT EXISTS analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    disease TEXT NOT NULL,
    confidence NUMERIC(5,2) NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    image_url TEXT,
    notes TEXT,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    field_name TEXT,
    location_accuracy TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shared_analyses table
CREATE TABLE IF NOT EXISTS shared_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
    share_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create disease_trends table
CREATE TABLE IF NOT EXISTS disease_trends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    region TEXT NOT NULL,
    disease TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    week_start DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(region, disease, week_start)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_disease ON analyses(disease);
CREATE INDEX IF NOT EXISTS idx_shared_analyses_token ON shared_analyses(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_analyses_analysis_id ON shared_analyses(analysis_id);
CREATE INDEX IF NOT EXISTS idx_disease_trends_week_start ON disease_trends(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_disease_trends_region ON disease_trends(region);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE disease_trends ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- RLS Policies for analyses table
CREATE POLICY "Users can only see their own analyses"
    ON analyses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analyses"
    ON analyses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses"
    ON analyses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
    ON analyses FOR DELETE
    USING (auth.uid() = user_id);

-- Allow public read access to shared analyses (via token)
CREATE POLICY "Public can view shared analyses"
    ON analyses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM shared_analyses
            WHERE shared_analyses.analysis_id = analyses.id
            AND shared_analyses.share_token IS NOT NULL
            AND (shared_analyses.expires_at IS NULL OR shared_analyses.expires_at > NOW())
        )
    );

-- RLS Policies for shared_analyses table
CREATE POLICY "Users can create shares for their analyses"
    ON shared_analyses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM analyses
            WHERE analyses.id = shared_analyses.analysis_id
            AND analyses.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view shares for their analyses"
    ON shared_analyses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM analyses
            WHERE analyses.id = shared_analyses.analysis_id
            AND analyses.user_id = auth.uid()
        )
    );

CREATE POLICY "Public can view valid shared analyses by token"
    ON shared_analyses FOR SELECT
    USING (
        share_token IS NOT NULL
        AND (expires_at IS NULL OR expires_at > NOW())
    );

-- RLS Policies for disease_trends (aggregated data, read-only for all)
CREATE POLICY "Anyone can view disease trends"
    ON disease_trends FOR SELECT
    USING (true);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

