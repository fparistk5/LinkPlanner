-- Drop any existing policies and triggers
DROP POLICY IF EXISTS notes_profile_isolation ON notes;
DROP POLICY IF EXISTS email_alerts_profile_isolation ON email_alerts;
DROP TRIGGER IF EXISTS ensure_notes_isolation ON notes;
DROP TRIGGER IF EXISTS ensure_email_alerts_isolation ON email_alerts;

-- Drop any existing functions
DROP FUNCTION IF EXISTS prevent_data_inheritance();
DROP FUNCTION IF EXISTS set_profile_context(INTEGER);

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
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_notes_profile_id ON notes(profile_id);
        
        -- Update existing records
        UPDATE notes SET profile_id = 1 WHERE profile_id IS NULL;
        
        -- Make it required
        ALTER TABLE notes ALTER COLUMN profile_id SET NOT NULL;
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
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_email_alerts_profile_id ON email_alerts(profile_id);
        
        -- Update existing records
        UPDATE email_alerts SET profile_id = 1 WHERE profile_id IS NULL;
        
        -- Make it required
        ALTER TABLE email_alerts ALTER COLUMN profile_id SET NOT NULL;
    END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- Create profile context function
CREATE OR REPLACE FUNCTION set_profile_context(profile_id INTEGER)
RETURNS void AS $$
BEGIN
    IF profile_id IS NULL THEN
        PERFORM set_config('app.profile_id', '', true);
    ELSE
        PERFORM set_config('app.profile_id', profile_id::text, true);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create data isolation function
CREATE OR REPLACE FUNCTION prevent_data_inheritance()
RETURNS TRIGGER AS $$
DECLARE
    current_profile_id INTEGER;
BEGIN
    current_profile_id := nullif(current_setting('app.profile_id', true), '')::INTEGER;
    
    IF current_profile_id IS NOT NULL THEN
        NEW.profile_id := current_profile_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies
CREATE POLICY notes_profile_isolation ON notes
    FOR ALL
    USING (profile_id = COALESCE(nullif(current_setting('app.profile_id', true), '')::INTEGER, profile_id));

CREATE POLICY email_alerts_profile_isolation ON email_alerts
    FOR ALL
    USING (profile_id = COALESCE(nullif(current_setting('app.profile_id', true), '')::INTEGER, profile_id));

CREATE POLICY groups_profile_isolation ON groups
    FOR ALL
    USING (profile_id = COALESCE(nullif(current_setting('app.profile_id', true), '')::INTEGER, profile_id));

CREATE POLICY links_profile_isolation ON links
    FOR ALL
    USING (profile_id = COALESCE(nullif(current_setting('app.profile_id', true), '')::INTEGER, profile_id));

-- Create triggers for data isolation
CREATE TRIGGER ensure_notes_isolation
    BEFORE INSERT OR UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION prevent_data_inheritance();

CREATE TRIGGER ensure_email_alerts_isolation
    BEFORE INSERT OR UPDATE ON email_alerts
    FOR EACH ROW
    EXECUTE FUNCTION prevent_data_inheritance();

CREATE TRIGGER ensure_groups_isolation
    BEFORE INSERT OR UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION prevent_data_inheritance();

CREATE TRIGGER ensure_links_isolation
    BEFORE INSERT OR UPDATE ON links
    FOR EACH ROW
    EXECUTE FUNCTION prevent_data_inheritance(); 