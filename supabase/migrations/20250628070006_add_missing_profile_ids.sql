-- Add profile_id to notes
ALTER TABLE notes 
ADD COLUMN profile_id INTEGER REFERENCES network_profiles(id) ON DELETE CASCADE;

-- Add profile_id to email_alerts
ALTER TABLE email_alerts 
ADD COLUMN profile_id INTEGER REFERENCES network_profiles(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX idx_notes_profile_id ON notes(profile_id);
CREATE INDEX idx_email_alerts_profile_id ON email_alerts(profile_id);

-- Update existing records to use TechKeyz profile ID (1)
UPDATE notes SET profile_id = 1;
UPDATE email_alerts SET profile_id = 1;

-- Make profile_id required
ALTER TABLE notes ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE email_alerts ALTER COLUMN profile_id SET NOT NULL;

-- Enable RLS on all tables if not already enabled
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_alerts ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS notes_profile_isolation ON notes;
DROP POLICY IF EXISTS email_alerts_profile_isolation ON email_alerts;

-- Create RLS policies
CREATE POLICY notes_profile_isolation ON notes
    FOR ALL
    USING (profile_id = COALESCE(nullif(current_setting('app.profile_id', true), '')::INTEGER, profile_id));

CREATE POLICY email_alerts_profile_isolation ON email_alerts
    FOR ALL
    USING (profile_id = COALESCE(nullif(current_setting('app.profile_id', true), '')::INTEGER, profile_id));

-- Create or replace the profile context function
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

-- Create or replace the data isolation function
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

-- Drop any existing triggers
DROP TRIGGER IF EXISTS ensure_notes_isolation ON notes;
DROP TRIGGER IF EXISTS ensure_email_alerts_isolation ON email_alerts;

-- Create triggers for data isolation
CREATE TRIGGER ensure_notes_isolation
    BEFORE INSERT OR UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION prevent_data_inheritance();

CREATE TRIGGER ensure_email_alerts_isolation
    BEFORE INSERT OR UPDATE ON email_alerts
    FOR EACH ROW
    EXECUTE FUNCTION prevent_data_inheritance(); 