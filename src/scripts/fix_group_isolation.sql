-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS enforce_groups_isolation ON groups;
DROP FUNCTION IF EXISTS enforce_group_isolation();

-- Create a new trigger function for group isolation
CREATE OR REPLACE FUNCTION enforce_group_isolation()
RETURNS TRIGGER AS $$
DECLARE
    current_profile_id INTEGER;
BEGIN
    -- Get the current profile context
    current_profile_id := nullif(current_setting('app.profile_id', true), '')::INTEGER;
    
    -- If we have a profile context, enforce it
    IF current_profile_id IS NOT NULL THEN
        NEW.profile_id := current_profile_id;
    END IF;
    
    -- If we still don't have a profile_id, use the one provided in the INSERT/UPDATE
    IF NEW.profile_id IS NULL THEN
        RAISE EXCEPTION 'profile_id cannot be null';
    END IF;
    
    -- Prevent inheriting groups from other profiles
    IF TG_OP = 'INSERT' THEN
        -- For new groups, ensure they belong to the current profile
        IF current_profile_id IS NOT NULL AND NEW.profile_id != current_profile_id THEN
            RAISE EXCEPTION 'Cannot create groups for other profiles';
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- For updates, ensure we're not changing the profile_id
        IF NEW.profile_id != OLD.profile_id THEN
            RAISE EXCEPTION 'Cannot change group profile ownership';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the new trigger
CREATE TRIGGER enforce_groups_isolation
    BEFORE INSERT OR UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION enforce_group_isolation();

-- Verify and fix any groups that might have wrong profile_ids
WITH profile_groups AS (
    SELECT DISTINCT profile_id 
    FROM groups
    WHERE profile_id IS NOT NULL
)
SELECT pg.profile_id, np.name as profile_name, COUNT(g.*) as group_count
FROM profile_groups pg
LEFT JOIN network_profiles np ON np.id = pg.profile_id
LEFT JOIN groups g ON g.profile_id = pg.profile_id
GROUP BY pg.profile_id, np.name
ORDER BY pg.profile_id;

-- Create a function to properly create a group for a profile
CREATE OR REPLACE FUNCTION create_profile_group(
    p_profile_id INTEGER,
    p_name TEXT,
    p_color TEXT DEFAULT '#3b82f6',
    p_display_order INTEGER DEFAULT 1
) RETURNS void AS $$
BEGIN
    -- Set the profile context
    PERFORM set_config('app.profile_id', p_profile_id::text, true);
    
    -- Create the group
    INSERT INTO groups (
        name,
        color,
        display_order,
        note_group_id,
        parent_group_id,
        profile_id
    ) VALUES (
        p_name,
        p_color,
        p_display_order,
        NULL,
        NULL,
        p_profile_id
    );
END;
$$ LANGUAGE plpgsql; 