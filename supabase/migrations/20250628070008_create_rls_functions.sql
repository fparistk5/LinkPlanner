-- Function to enable RLS on specified tables
CREATE OR REPLACE FUNCTION enable_rls(table_names text[])
RETURNS void AS $$
DECLARE
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY table_names
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create profile context function
CREATE OR REPLACE FUNCTION create_profile_context_function()
RETURNS void AS $$
BEGIN
    CREATE OR REPLACE FUNCTION set_profile_context(profile_id INTEGER)
    RETURNS void AS $func$
    BEGIN
        IF profile_id IS NULL THEN
            PERFORM set_config('app.profile_id', '', true);
        ELSE
            PERFORM set_config('app.profile_id', profile_id::text, true);
        END IF;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create isolation trigger function
CREATE OR REPLACE FUNCTION create_isolation_trigger()
RETURNS void AS $$
BEGIN
    CREATE OR REPLACE FUNCTION enforce_profile_isolation()
    RETURNS TRIGGER AS $func$
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
    $func$ LANGUAGE plpgsql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create RLS policies
CREATE OR REPLACE FUNCTION create_rls_policies()
RETURNS void AS $$
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS notes_isolation_policy ON notes;
    DROP POLICY IF EXISTS email_alerts_isolation_policy ON email_alerts;
    DROP POLICY IF EXISTS groups_isolation_policy ON groups;
    DROP POLICY IF EXISTS links_isolation_policy ON links;

    -- Create new policies
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create isolation triggers
CREATE OR REPLACE FUNCTION create_isolation_triggers()
RETURNS void AS $$
BEGIN
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to fix existing profile data
CREATE OR REPLACE FUNCTION fix_profile_data()
RETURNS void AS $$
BEGIN
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 