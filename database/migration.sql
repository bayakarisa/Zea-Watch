-- Migration script for existing Supabase database
-- This safely adds missing columns and tables without deleting existing data

-- Step 1: Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Create users table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    location TEXT,
    subscription_tier TEXT DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Update analyses table - Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'analyses' AND column_name = 'user_id') THEN
        ALTER TABLE analyses ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    -- Add latitude column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'analyses' AND column_name = 'latitude') THEN
        ALTER TABLE analyses ADD COLUMN latitude NUMERIC(10, 8);
    END IF;

    -- Add longitude column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'analyses' AND column_name = 'longitude') THEN
        ALTER TABLE analyses ADD COLUMN longitude NUMERIC(11, 8);
    END IF;

    -- Add field_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'analyses' AND column_name = 'field_name') THEN
        ALTER TABLE analyses ADD COLUMN field_name TEXT;
    END IF;

    -- Add location_accuracy column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'analyses' AND column_name = 'location_accuracy') THEN
        ALTER TABLE analyses ADD COLUMN location_accuracy TEXT;
    END IF;

    -- Add notes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'analyses' AND column_name = 'notes') THEN
        ALTER TABLE analyses ADD COLUMN notes TEXT;
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'analyses' AND column_name = 'updated_at') THEN
        ALTER TABLE analyses ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Ensure confidence is NUMERIC(5,2) if it exists but is wrong type
    -- Note: This might fail if data exists - you may need to convert it manually
    -- ALTER TABLE analyses ALTER COLUMN confidence TYPE NUMERIC(5,2);
END $$;

-- Step 4: Create shared_analyses table - uses BIGINT to match existing analyses.id
-- Since your analyses.id is bigint, we'll use bigint for the foreign key
CREATE TABLE IF NOT EXISTS shared_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    analysis_id BIGINT REFERENCES analyses(id) ON DELETE CASCADE,
    share_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create disease_trends table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS disease_trends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    region TEXT NOT NULL,
    disease TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    week_start DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(region, disease, week_start)
);

-- Step 7: Create indexes (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_disease ON analyses(disease);
CREATE INDEX IF NOT EXISTS idx_shared_analyses_token ON shared_analyses(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_analyses_analysis_id ON shared_analyses(analysis_id);
CREATE INDEX IF NOT EXISTS idx_disease_trends_week_start ON disease_trends(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_disease_trends_region ON disease_trends(region);

-- Step 8: Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE disease_trends ENABLE ROW LEVEL SECURITY;

-- Step 9: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can only see their own analyses" ON analyses;
DROP POLICY IF EXISTS "Users can insert their own analyses" ON analyses;
DROP POLICY IF EXISTS "Users can update their own analyses" ON analyses;
DROP POLICY IF EXISTS "Users can delete their own analyses" ON analyses;
DROP POLICY IF EXISTS "Public can view shared analyses" ON analyses;
DROP POLICY IF EXISTS "Users can create shares for their analyses" ON shared_analyses;
DROP POLICY IF EXISTS "Users can view shares for their analyses" ON shared_analyses;
DROP POLICY IF EXISTS "Public can view valid shared analyses by token" ON shared_analyses;
DROP POLICY IF EXISTS "Anyone can view disease trends" ON disease_trends;

-- Step 10: Create RLS Policies for users table
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Step 11: Create RLS Policies for analyses table
CREATE POLICY "Users can only see their own analyses"
    ON analyses FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own analyses"
    ON analyses FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own analyses"
    ON analyses FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own analyses"
    ON analyses FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

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

-- Step 12: Create RLS Policies for shared_analyses table
CREATE POLICY "Users can create shares for their analyses"
    ON shared_analyses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM analyses
            WHERE analyses.id = shared_analyses.analysis_id
            AND (analyses.user_id = auth.uid() OR analyses.user_id IS NULL)
        )
    );

CREATE POLICY "Users can view shares for their analyses"
    ON shared_analyses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM analyses
            WHERE analyses.id = shared_analyses.analysis_id
            AND (analyses.user_id = auth.uid() OR analyses.user_id IS NULL)
        )
    );

CREATE POLICY "Public can view valid shared analyses by token"
    ON shared_analyses FOR SELECT
    USING (
        share_token IS NOT NULL
        AND (expires_at IS NULL OR expires_at > NOW())
    );

-- Step 13: Create RLS Policies for disease_trends (aggregated data, read-only for all)
CREATE POLICY "Anyone can view disease trends"
    ON disease_trends FOR SELECT
    USING (true);

-- Step 14: Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 15: Create trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

