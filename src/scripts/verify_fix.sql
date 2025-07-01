-- Check if all tables have RLS enabled
SELECT schemaname, tablename, hasrowsecurity, rowsecurity
FROM pg_tables
WHERE tablename IN ('notes', 'email_alerts', 'groups', 'links')
AND schemaname = 'public';

-- Check if all policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('notes', 'email_alerts', 'groups', 'links')
AND schemaname = 'public';

-- Check if all triggers exist
SELECT 
    tgname AS trigger_name,
    relname AS table_name,
    proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE relname IN ('notes', 'email_alerts', 'groups', 'links')
AND tgname LIKE 'enforce_%_isolation';

-- Check data distribution after fixes
SELECT 'notes' as table_type, COUNT(*) as total_count, 
       array_agg(DISTINCT profile_id) as profile_ids 
FROM notes
UNION ALL
SELECT 'email_alerts', COUNT(*), array_agg(DISTINCT profile_id) 
FROM email_alerts
UNION ALL
SELECT 'groups', COUNT(*), array_agg(DISTINCT profile_id) 
FROM groups
UNION ALL
SELECT 'links', COUNT(*), array_agg(DISTINCT profile_id) 
FROM links;

-- Check for any mismatches between groups and their related items
SELECT 'links_mismatch' as check_type, COUNT(*) as mismatch_count
FROM links l
JOIN groups g ON l.group_id = g.id
WHERE l.profile_id != g.profile_id
UNION ALL
SELECT 'notes_mismatch', COUNT(*)
FROM notes n
JOIN groups g ON n.group_id = g.id
WHERE n.profile_id != g.profile_id
UNION ALL
SELECT 'email_alerts_mismatch', COUNT(*)
FROM email_alerts ea
JOIN groups g ON ea.group_id = g.id
WHERE ea.profile_id != g.profile_id; 