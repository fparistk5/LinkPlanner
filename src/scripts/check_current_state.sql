-- Check table columns
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('notes', 'email_alerts', 'groups', 'links')
ORDER BY table_name, ordinal_position;

-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('notes', 'email_alerts', 'groups', 'links');

-- Check existing policies
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('notes', 'email_alerts', 'groups', 'links');

-- Check existing triggers
SELECT 
    tgname as trigger_name,
    relname as table_name,
    proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE relname IN ('notes', 'email_alerts', 'groups', 'links');

-- Check data distribution
SELECT 
    'notes' as table_name,
    COUNT(*) as total_count,
    COUNT(DISTINCT profile_id) as distinct_profiles
FROM notes
WHERE profile_id IS NOT NULL
UNION ALL
SELECT 
    'email_alerts',
    COUNT(*),
    COUNT(DISTINCT profile_id)
FROM email_alerts
WHERE profile_id IS NOT NULL
UNION ALL
SELECT 
    'groups',
    COUNT(*),
    COUNT(DISTINCT profile_id)
FROM groups
WHERE profile_id IS NOT NULL
UNION ALL
SELECT 
    'links',
    COUNT(*),
    COUNT(DISTINCT profile_id)
FROM links
WHERE profile_id IS NOT NULL; 