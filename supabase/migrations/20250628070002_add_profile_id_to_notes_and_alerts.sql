-- Create email_alerts table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    frequency TEXT NOT NULL,
    last_sent TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add profile_id columns if they don't exist
DO $$ 
BEGIN 
    -- Add profile_id to notes if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notes' 
        AND column_name = 'profile_id'
    ) THEN
        ALTER TABLE notes 
        ADD COLUMN profile_id INTEGER REFERENCES network_profiles(id) ON DELETE CASCADE;
    END IF;

    -- Add profile_id to email_alerts if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'email_alerts' 
        AND column_name = 'profile_id'
    ) THEN
        ALTER TABLE email_alerts 
        ADD COLUMN profile_id INTEGER REFERENCES network_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'idx_notes_profile_id'
    ) THEN
        CREATE INDEX idx_notes_profile_id ON notes(profile_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'idx_email_alerts_profile_id'
    ) THEN
        CREATE INDEX idx_email_alerts_profile_id ON email_alerts(profile_id);
    END IF;
END $$;

-- Update existing records to use TechKeyz profile ID (1)
UPDATE notes SET profile_id = 1 WHERE profile_id IS NULL;
UPDATE email_alerts SET profile_id = 1 WHERE profile_id IS NULL;

-- Make profile_id required for future inserts
ALTER TABLE notes ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE email_alerts ALTER COLUMN profile_id SET NOT NULL;

-- Enable RLS and create policies
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_alerts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS notes_profile_isolation ON notes;
DROP POLICY IF EXISTS email_alerts_profile_isolation ON email_alerts;

-- Create new policies
CREATE POLICY notes_profile_isolation ON notes
    FOR ALL
    USING (profile_id = current_setting('app.profile_id', true)::INTEGER);

CREATE POLICY email_alerts_profile_isolation ON email_alerts
    FOR ALL
    USING (profile_id = current_setting('app.profile_id', true)::INTEGER);

-- Create function to prevent data inheritance
CREATE OR REPLACE FUNCTION prevent_data_inheritance()
RETURNS TRIGGER AS $$
BEGIN
    -- Do not copy any data for new profiles
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent inheritance
DROP TRIGGER IF EXISTS prevent_data_inheritance_trigger ON network_profiles;
CREATE TRIGGER prevent_data_inheritance_trigger
    AFTER INSERT ON network_profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_data_inheritance(); 