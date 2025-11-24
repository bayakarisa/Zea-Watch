-- Create uploads table
CREATE TABLE IF NOT EXISTS uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at DESC);

-- Enable RLS
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for uploads
-- Note: These policies assume you are using Supabase Auth or setting auth.uid() correctly.
-- If using service_role key in backend, these are bypassed, but good to have for security.

DROP POLICY IF EXISTS "Users can view their own uploads" ON uploads;
CREATE POLICY "Users can view their own uploads"
    ON uploads FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own uploads" ON uploads;
CREATE POLICY "Users can insert their own uploads"
    ON uploads FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own uploads" ON uploads;
CREATE POLICY "Users can delete their own uploads"
    ON uploads FOR DELETE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all uploads" ON uploads;
CREATE POLICY "Admins can view all uploads"
    ON uploads FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
