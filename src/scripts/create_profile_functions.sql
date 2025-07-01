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
CREATE OR REPLACE FUNCTION enforce_profile_isolation()
RETURNS TRIGGER AS $$
BEGIN
    -- Set the profile_id to match the current context
    NEW.profile_id = nullif(current_setting('app.profile_id', true), '')::INTEGER;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to enforce isolation
DROP TRIGGER IF EXISTS enforce_notes_isolation ON notes;
CREATE TRIGGER enforce_notes_isolation
    BEFORE INSERT OR UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION enforce_profile_isolation();

DROP TRIGGER IF EXISTS enforce_email_alerts_isolation ON email_alerts;
CREATE TRIGGER enforce_email_alerts_isolation
    BEFORE INSERT OR UPDATE ON email_alerts
    FOR EACH ROW
    EXECUTE FUNCTION enforce_profile_isolation();

DROP TRIGGER IF EXISTS enforce_groups_isolation ON groups;
CREATE TRIGGER enforce_groups_isolation
    BEFORE INSERT OR UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION enforce_profile_isolation();

DROP TRIGGER IF EXISTS enforce_links_isolation ON links;
CREATE TRIGGER enforce_links_isolation
    BEFORE INSERT OR UPDATE ON links
    FOR EACH ROW
    EXECUTE FUNCTION enforce_profile_isolation(); 