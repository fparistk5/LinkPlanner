-- Function to set profile context
CREATE OR REPLACE FUNCTION set_profile_context(profile_id INTEGER)
RETURNS void AS $$
BEGIN
    -- Set the profile context for RLS policies
    IF profile_id IS NULL THEN
        PERFORM set_config('app.profile_id', '', true);
    ELSE
        PERFORM set_config('app.profile_id', profile_id::text, true);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current profile context
CREATE OR REPLACE FUNCTION get_profile_context()
RETURNS INTEGER AS $$
BEGIN
    RETURN nullif(current_setting('app.profile_id', true), '')::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure data isolation
CREATE OR REPLACE FUNCTION ensure_profile_isolation()
RETURNS TRIGGER AS $$
BEGIN
    -- Get the current profile context
    DECLARE
        current_profile_id INTEGER;
    BEGIN
        current_profile_id := nullif(current_setting('app.profile_id', true), '')::INTEGER;
        
        -- If we have a profile context, enforce it
        IF current_profile_id IS NOT NULL THEN
            NEW.profile_id := current_profile_id;
        END IF;
        
        RETURN NEW;
    END;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to enforce profile isolation
DROP TRIGGER IF EXISTS ensure_notes_isolation ON notes;
CREATE TRIGGER ensure_notes_isolation
    BEFORE INSERT OR UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION ensure_profile_isolation();

DROP TRIGGER IF EXISTS ensure_email_alerts_isolation ON email_alerts;
CREATE TRIGGER ensure_email_alerts_isolation
    BEFORE INSERT OR UPDATE ON email_alerts
    FOR EACH ROW
    EXECUTE FUNCTION ensure_profile_isolation();

DROP TRIGGER IF EXISTS ensure_groups_isolation ON groups;
CREATE TRIGGER ensure_groups_isolation
    BEFORE INSERT OR UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION ensure_profile_isolation();

DROP TRIGGER IF EXISTS ensure_links_isolation ON links;
CREATE TRIGGER ensure_links_isolation
    BEFORE INSERT OR UPDATE ON links
    FOR EACH ROW
    EXECUTE FUNCTION ensure_profile_isolation(); 