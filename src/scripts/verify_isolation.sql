-- Check if columns exist and are NOT NULL
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('notes', 'email_alerts')
    AND column_name = 'profile_id';

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('notes', 'email_alerts', 'groups', 'links');

-- Check if policies exist
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('notes', 'email_alerts', 'groups', 'links');

-- Check if triggers exist
SELECT 
    tgname as trigger_name,
    relname as table_name,
    proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE relname IN ('notes', 'email_alerts', 'groups', 'links')
AND proname = 'enforce_profile_isolation';

-- Check data distribution
WITH profile_data AS (
    SELECT 'notes' as table_type, n.profile_id, np.name as profile_name, COUNT(*) as record_count
    FROM notes n
    LEFT JOIN network_profiles np ON n.profile_id = np.id
    GROUP BY n.profile_id, np.name
    UNION ALL
    SELECT 'email_alerts' as table_type, ea.profile_id, np.name as profile_name, COUNT(*) as record_count
    FROM email_alerts ea
    LEFT JOIN network_profiles np ON ea.profile_id = np.id
    GROUP BY ea.profile_id, np.name
    UNION ALL
    SELECT 'groups' as table_type, g.profile_id, np.name as profile_name, COUNT(*) as record_count
    FROM groups g
    LEFT JOIN network_profiles np ON g.profile_id = np.id
    GROUP BY g.profile_id, np.name
    UNION ALL
    SELECT 'links' as table_type, l.profile_id, np.name as profile_name, COUNT(*) as record_count
    FROM links l
    LEFT JOIN network_profiles np ON l.profile_id = np.id
    GROUP BY l.profile_id, np.name
)
SELECT 
    table_type,
    profile_id,
    profile_name,
    record_count
FROM profile_data
ORDER BY table_type, profile_id;

-- Test the isolation mechanism
SELECT test_profile_isolation();

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('notes', 'email_alerts', 'groups', 'links');

-- Verify policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('notes', 'email_alerts', 'groups', 'links');

-- Verify triggers exist
SELECT 
    tgname as trigger_name,
    relname as table_name,
    proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE relname IN ('notes', 'email_alerts', 'groups', 'links')
AND proname = 'enforce_profile_isolation';

-- Check data distribution
SELECT 
    'notes' as table_name,
    profile_id,
    count(*) as record_count
FROM notes
GROUP BY profile_id
UNION ALL
SELECT 
    'email_alerts' as table_name,
    profile_id,
    count(*) as record_count
FROM email_alerts
GROUP BY profile_id
UNION ALL
SELECT 
    'groups' as table_name,
    profile_id,
    count(*) as record_count
FROM groups
GROUP BY profile_id
UNION ALL
SELECT 
    'links' as table_name,
    profile_id,
    count(*) as record_count
FROM links
GROUP BY profile_id
ORDER BY table_name, profile_id; 