-- Add profile_id columns
ALTER TABLE notes ADD COLUMN profile_id INTEGER REFERENCES network_profiles(id) ON DELETE CASCADE;
ALTER TABLE email_alerts ADD COLUMN profile_id INTEGER REFERENCES network_profiles(id) ON DELETE CASCADE;

-- First, let's fix any existing data to ensure proper profile_id relationships
UPDATE links l
SET profile_id = g.profile_id
FROM groups g
WHERE l.group_id = g.id
AND l.profile_id != g.profile_id;

UPDATE notes n
SET profile_id = g.profile_id
FROM groups g
WHERE n.group_id = g.id
AND n.profile_id != g.profile_id;

UPDATE email_alerts ea
SET profile_id = g.profile_id
FROM groups g
WHERE ea.group_id = g.id
AND ea.profile_id != g.profile_id;

-- Set initial profile_id values based on their group's profile_id
UPDATE notes n
SET profile_id = g.profile_id
FROM groups g
WHERE n.group_id = g.id;

UPDATE email_alerts ea
SET profile_id = g.profile_id
FROM groups g
WHERE ea.group_id = g.id;

-- Set any remaining NULL profile_ids to 1 (TechKeyz profile)
UPDATE notes SET profile_id = 1 WHERE profile_id IS NULL;
UPDATE email_alerts SET profile_id = 1 WHERE profile_id IS NULL;

-- Make profile_id required
ALTER TABLE notes ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE email_alerts ALTER COLUMN profile_id SET NOT NULL;

-- Enable RLS on all tables that need profile isolation
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

-- Create profile isolation trigger function
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
    
    -- Handle table-specific logic
    CASE TG_TABLE_NAME
        WHEN 'links' THEN
            IF NEW.group_id IS NOT NULL THEN
                SELECT profile_id INTO group_profile_id
                FROM groups
                WHERE id = NEW.group_id;
                
                IF group_profile_id IS NOT NULL THEN
                    NEW.profile_id := group_profile_id;
                END IF;
            END IF;
        WHEN 'notes' THEN
            IF NEW.group_id IS NOT NULL THEN
                SELECT profile_id INTO group_profile_id
                FROM groups
                WHERE id = NEW.group_id;
                
                IF group_profile_id IS NOT NULL THEN
                    NEW.profile_id := group_profile_id;
                END IF;
            END IF;
        WHEN 'email_alerts' THEN
            IF NEW.group_id IS NOT NULL THEN
                SELECT profile_id INTO group_profile_id
                FROM groups
                WHERE id = NEW.group_id;
                
                IF group_profile_id IS NOT NULL THEN
                    NEW.profile_id := group_profile_id;
                END IF;
            END IF;
        ELSE
            -- For other tables (like groups), just use the profile context or provided profile_id
            NULL;
    END CASE;
    
    -- If we still don't have a profile_id, use the one provided in the INSERT/UPDATE
    IF NEW.profile_id IS NULL THEN
        RAISE EXCEPTION 'profile_id cannot be null';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for profile isolation
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

-- Drop existing policies
DROP POLICY IF EXISTS notes_isolation_policy ON notes;
DROP POLICY IF EXISTS email_alerts_isolation_policy ON email_alerts;
DROP POLICY IF EXISTS groups_isolation_policy ON groups;
DROP POLICY IF EXISTS links_isolation_policy ON links;

-- Create more granular policies for each operation
-- Notes policies
CREATE POLICY notes_select_policy ON notes
    FOR SELECT USING (
        CASE 
            WHEN current_setting('app.profile_id', true) = '' OR current_setting('app.profile_id', true) IS NULL THEN true
            ELSE profile_id = nullif(current_setting('app.profile_id', true), '')::INTEGER
        END
    );

CREATE POLICY notes_insert_policy ON notes
    FOR INSERT WITH CHECK (true);  -- Allow insert, trigger will handle profile_id

CREATE POLICY notes_update_policy ON notes
    FOR UPDATE USING (
        CASE 
            WHEN current_setting('app.profile_id', true) = '' OR current_setting('app.profile_id', true) IS NULL THEN true
            ELSE profile_id = nullif(current_setting('app.profile_id', true), '')::INTEGER
        END
    );

CREATE POLICY notes_delete_policy ON notes
    FOR DELETE USING (
        CASE 
            WHEN current_setting('app.profile_id', true) = '' OR current_setting('app.profile_id', true) IS NULL THEN true
            ELSE profile_id = nullif(current_setting('app.profile_id', true), '')::INTEGER
        END
    );

-- Email alerts policies
CREATE POLICY email_alerts_select_policy ON email_alerts
    FOR SELECT USING (
        CASE 
            WHEN current_setting('app.profile_id', true) = '' OR current_setting('app.profile_id', true) IS NULL THEN true
            ELSE profile_id = nullif(current_setting('app.profile_id', true), '')::INTEGER
        END
    );

CREATE POLICY email_alerts_insert_policy ON email_alerts
    FOR INSERT WITH CHECK (true);  -- Allow insert, trigger will handle profile_id

CREATE POLICY email_alerts_update_policy ON email_alerts
    FOR UPDATE USING (
        CASE 
            WHEN current_setting('app.profile_id', true) = '' OR current_setting('app.profile_id', true) IS NULL THEN true
            ELSE profile_id = nullif(current_setting('app.profile_id', true), '')::INTEGER
        END
    );

CREATE POLICY email_alerts_delete_policy ON email_alerts
    FOR DELETE USING (
        CASE 
            WHEN current_setting('app.profile_id', true) = '' OR current_setting('app.profile_id', true) IS NULL THEN true
            ELSE profile_id = nullif(current_setting('app.profile_id', true), '')::INTEGER
        END
    );

-- Groups policies
CREATE POLICY groups_select_policy ON groups
    FOR SELECT USING (
        CASE 
            WHEN current_setting('app.profile_id', true) = '' OR current_setting('app.profile_id', true) IS NULL THEN true
            ELSE profile_id = nullif(current_setting('app.profile_id', true), '')::INTEGER
        END
    );

CREATE POLICY groups_insert_policy ON groups
    FOR INSERT WITH CHECK (true);  -- Allow insert, trigger will handle profile_id

CREATE POLICY groups_update_policy ON groups
    FOR UPDATE USING (
        CASE 
            WHEN current_setting('app.profile_id', true) = '' OR current_setting('app.profile_id', true) IS NULL THEN true
            ELSE profile_id = nullif(current_setting('app.profile_id', true), '')::INTEGER
        END
    );

CREATE POLICY groups_delete_policy ON groups
    FOR DELETE USING (
        CASE 
            WHEN current_setting('app.profile_id', true) = '' OR current_setting('app.profile_id', true) IS NULL THEN true
            ELSE profile_id = nullif(current_setting('app.profile_id', true), '')::INTEGER
        END
    );

-- Links policies
CREATE POLICY links_select_policy ON links
    FOR SELECT USING (
        CASE 
            WHEN current_setting('app.profile_id', true) = '' OR current_setting('app.profile_id', true) IS NULL THEN true
            ELSE profile_id = nullif(current_setting('app.profile_id', true), '')::INTEGER
        END
    );

CREATE POLICY links_insert_policy ON links
    FOR INSERT WITH CHECK (true);  -- Allow insert, trigger will handle profile_id

CREATE POLICY links_update_policy ON links
    FOR UPDATE USING (
        CASE 
            WHEN current_setting('app.profile_id', true) = '' OR current_setting('app.profile_id', true) IS NULL THEN true
            ELSE profile_id = nullif(current_setting('app.profile_id', true), '')::INTEGER
        END
    );

CREATE POLICY links_delete_policy ON links
    FOR DELETE USING (
        CASE 
            WHEN current_setting('app.profile_id', true) = '' OR current_setting('app.profile_id', true) IS NULL THEN true
            ELSE profile_id = nullif(current_setting('app.profile_id', true), '')::INTEGER
        END
    );

-- Create a function to test the isolation
CREATE OR REPLACE FUNCTION test_profile_isolation()
RETURNS text AS $$
DECLARE
    test_profile_id INTEGER;
    test_group_id UUID;
    test_note_id UUID;
    result TEXT;
BEGIN
    -- Create a test profile
    INSERT INTO network_profiles (name, wallet_address)
    VALUES ('Test Profile', '0xtest')
    RETURNING id INTO test_profile_id;

    -- Set the profile context
    PERFORM set_profile_context(test_profile_id);

    -- Try to create a group with a different profile_id
    BEGIN
        INSERT INTO groups (name, color, display_order, profile_id)
        VALUES ('Test Group', '#000000', 1, 1)
        RETURNING id INTO test_group_id;

        -- Try to create a note with a different profile_id
        INSERT INTO notes (title, description, group_id, profile_id)
        VALUES ('Test Note', 'Test Description', test_group_id, 1)
        RETURNING id INTO test_note_id;

        -- Check if the profile_id was enforced
        SELECT 
            CASE 
                WHEN g.profile_id = test_profile_id AND n.profile_id = test_profile_id THEN 'Profile isolation working correctly'
                ELSE 'Profile isolation failed'
            END INTO result
        FROM groups g
        JOIN notes n ON n.group_id = g.id
        WHERE g.id = test_group_id AND n.id = test_note_id;

        -- Clean up test data
        DELETE FROM notes WHERE id = test_note_id;
        DELETE FROM groups WHERE id = test_group_id;
        DELETE FROM network_profiles WHERE id = test_profile_id;

        RETURN COALESCE(result, 'Profile isolation test completed');
    EXCEPTION 
        WHEN OTHERS THEN
            -- Clean up any data that might have been created
            IF test_note_id IS NOT NULL THEN
                DELETE FROM notes WHERE id = test_note_id;
            END IF;
            IF test_group_id IS NOT NULL THEN
                DELETE FROM groups WHERE id = test_group_id;
            END IF;
            IF test_profile_id IS NOT NULL THEN
                DELETE FROM network_profiles WHERE id = test_profile_id;
            END IF;
            
            RETURN 'Profile isolation test failed: ' || SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql; 