-- First, let's clean up any orphaned groups (groups whose profile doesn't exist)
DELETE FROM groups g
WHERE NOT EXISTS (
    SELECT 1 FROM network_profiles np WHERE np.id = g.profile_id
);

-- Update links to match their group's profile_id
UPDATE links l
SET profile_id = g.profile_id
FROM groups g
WHERE l.group_id = g.id
AND l.profile_id != g.profile_id;

-- Update notes to match their group's profile_id
UPDATE notes n
SET profile_id = g.profile_id
FROM groups g
WHERE n.group_id = g.id
AND n.profile_id != g.profile_id;

-- Update email_alerts to match their group's profile_id
UPDATE email_alerts ea
SET profile_id = g.profile_id
FROM groups g
WHERE ea.group_id = g.id
AND ea.profile_id != g.profile_id;

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

-- Create a trigger function to ensure positions is always empty for new profiles
CREATE OR REPLACE FUNCTION ensure_empty_positions()
RETURNS TRIGGER AS $$
BEGIN
    -- Always ensure positions is an empty JSONB object for new profiles
    NEW.positions = '{}'::jsonb;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS ensure_empty_positions_trigger ON network_profiles;
CREATE TRIGGER ensure_empty_positions_trigger
    BEFORE INSERT OR UPDATE OF positions ON network_profiles
    FOR EACH ROW
    EXECUTE FUNCTION ensure_empty_positions();

-- Fix any existing profiles that might have inherited positions
UPDATE network_profiles
SET positions = '{}'::jsonb
WHERE positions IS NULL OR positions::text != '{}';

-- Verify the changes
SELECT id, name, positions FROM network_profiles ORDER BY id;

-- Create a function to initialize a new profile with empty data
CREATE OR REPLACE FUNCTION initialize_new_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Always ensure positions is an empty JSONB object for new profiles
    NEW.positions = '{}'::jsonb;
    
    -- Clear any profile context to prevent data inheritance
    PERFORM set_config('app.profile_id', '', true);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to handle profile data access
CREATE OR REPLACE FUNCTION get_profile_data(profile_id INTEGER)
RETURNS jsonb AS $$
BEGIN
    -- Set the profile context
    PERFORM set_config('app.profile_id', profile_id::text, true);
    
    -- Return empty positions for new profiles
    RETURN '{}'::jsonb;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for new profiles
DROP TRIGGER IF EXISTS initialize_new_profile_trigger ON network_profiles;
CREATE TRIGGER initialize_new_profile_trigger
    BEFORE INSERT ON network_profiles
    FOR EACH ROW
    EXECUTE FUNCTION initialize_new_profile();

-- Create RLS policy for network_profiles
ALTER TABLE network_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS network_profiles_isolation ON network_profiles;

-- Create policy for network_profiles
CREATE POLICY network_profiles_isolation ON network_profiles
    FOR ALL
    USING (
        CASE 
            WHEN current_setting('app.profile_id', true) = '' OR current_setting('app.profile_id', true) IS NULL THEN true
            ELSE id = nullif(current_setting('app.profile_id', true), '')::INTEGER
        END
    );

-- Fix any existing profiles that might have inherited positions
UPDATE network_profiles
SET positions = '{}'::jsonb
WHERE positions IS NULL OR positions::text != '{}';

-- Create function to ensure clean profile creation
CREATE OR REPLACE FUNCTION create_clean_profile(
    p_name TEXT,
    p_wallet_address TEXT,
    p_nft_token_id TEXT DEFAULT NULL
) RETURNS network_profiles AS $$
DECLARE
    new_profile network_profiles;
BEGIN
    -- Clear any existing profile context
    PERFORM set_config('app.profile_id', '', true);
    
    -- Create the profile with empty positions
    INSERT INTO network_profiles (
        name,
        wallet_address,
        nft_token_id,
        positions
    ) VALUES (
        p_name,
        p_wallet_address,
        p_nft_token_id,
        '{}'::jsonb
    )
    RETURNING * INTO new_profile;
    
    -- Set the context to the new profile
    PERFORM set_config('app.profile_id', new_profile.id::text, true);
    
    RETURN new_profile;
END;
$$ LANGUAGE plpgsql;

-- Verify the changes
SELECT id, name, positions FROM network_profiles ORDER BY id; 