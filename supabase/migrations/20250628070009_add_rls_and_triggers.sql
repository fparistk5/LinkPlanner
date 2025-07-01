-- Enable RLS on all tables
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS notes_isolation_policy ON notes;
DROP POLICY IF EXISTS email_alerts_isolation_policy ON email_alerts;
DROP POLICY IF EXISTS groups_isolation_policy ON groups;
DROP POLICY IF EXISTS links_isolation_policy ON links;

-- Create new RLS policies
CREATE POLICY notes_isolation_policy ON notes
    FOR ALL
    USING (
        CASE 
            WHEN current_setting('app.profile_id', true) = '' OR current_setting('app.profile_id', true) IS NULL THEN true
            ELSE profile_id = nullif(current_setting('app.profile_id', true), '')::INTEGER
        END
    );

CREATE POLICY email_alerts_isolation_policy ON email_alerts
    FOR ALL
    USING (
        CASE 
            WHEN current_setting('app.profile_id', true) = '' OR current_setting('app.profile_id', true) IS NULL THEN true
            ELSE profile_id = nullif(current_setting('app.profile_id', true), '')::INTEGER
        END
    );

CREATE POLICY groups_isolation_policy ON groups
    FOR ALL
    USING (
        CASE 
            WHEN current_setting('app.profile_id', true) = '' OR current_setting('app.profile_id', true) IS NULL THEN true
            ELSE profile_id = nullif(current_setting('app.profile_id', true), '')::INTEGER
        END
    );

CREATE POLICY links_isolation_policy ON links
    FOR ALL
    USING (
        CASE 
            WHEN current_setting('app.profile_id', true) = '' OR current_setting('app.profile_id', true) IS NULL THEN true
            ELSE profile_id = nullif(current_setting('app.profile_id', true), '')::INTEGER
        END
    );

-- Create or replace functions
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

CREATE OR REPLACE FUNCTION enforce_profile_isolation()
RETURNS TRIGGER AS $$
DECLARE
    current_profile_id INTEGER;
    group_profile_id INTEGER;
BEGIN
    -- Get the current profile context
    current_profile_id := nullif(current_setting('app.profile_id', true), '')::INTEGER;
    
    -- If we have a profile context, enforce it
    IF current_profile_id IS NOT NULL THEN
        NEW.profile_id := current_profile_id;
    END IF;
    
    -- If this is a link/note/email_alert and it has a group_id, inherit the group's profile_id
    IF TG_TABLE_NAME IN ('links', 'notes', 'email_alerts') AND NEW.group_id IS NOT NULL THEN
        SELECT profile_id INTO group_profile_id
        FROM groups
        WHERE id = NEW.group_id;
        
        IF group_profile_id IS NOT NULL THEN
            NEW.profile_id := group_profile_id;
        END IF;
    END IF;
    
    -- If we still don't have a profile_id, use the one provided in the INSERT/UPDATE
    IF NEW.profile_id IS NULL THEN
        RAISE EXCEPTION 'profile_id cannot be null';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
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