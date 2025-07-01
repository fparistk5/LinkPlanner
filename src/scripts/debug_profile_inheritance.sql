-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables 
WHERE tablename IN ('notes', 'email_alerts', 'groups', 'links');

-- Check existing policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('notes', 'email_alerts', 'groups', 'links');

-- Check triggers
SELECT 
    trigger_schema,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('notes', 'email_alerts', 'groups', 'links');

-- Check data in each table
SELECT 'notes' as table_name, COUNT(*) as total_count, 
       COUNT(DISTINCT profile_id) as distinct_profiles,
       array_agg(DISTINCT profile_id) as profile_ids
FROM notes
UNION ALL
SELECT 'email_alerts', COUNT(*), 
       COUNT(DISTINCT profile_id),
       array_agg(DISTINCT profile_id)
FROM email_alerts
UNION ALL
SELECT 'groups', COUNT(*), 
       COUNT(DISTINCT profile_id),
       array_agg(DISTINCT profile_id)
FROM groups
UNION ALL
SELECT 'links', COUNT(*), 
       COUNT(DISTINCT profile_id),
       array_agg(DISTINCT profile_id)
FROM links;

-- Check profile data distribution
WITH profile_data AS (
    SELECT id, name, nft_token_id
    FROM network_profiles
)
SELECT 
    pd.id as profile_id,
    pd.name as profile_name,
    pd.nft_token_id,
    COUNT(DISTINCT n.id) as notes_count,
    COUNT(DISTINCT ea.id) as alerts_count,
    COUNT(DISTINCT g.id) as groups_count,
    COUNT(DISTINCT l.id) as links_count
FROM profile_data pd
LEFT JOIN notes n ON n.profile_id = pd.id
LEFT JOIN email_alerts ea ON ea.profile_id = pd.id
LEFT JOIN groups g ON g.profile_id = pd.id
LEFT JOIN links l ON l.profile_id = pd.id
GROUP BY pd.id, pd.name, pd.nft_token_id
ORDER BY pd.id;

-- Check for NULL profile_ids
SELECT 'notes' as table_name, COUNT(*) as null_count
FROM notes WHERE profile_id IS NULL
UNION ALL
SELECT 'email_alerts', COUNT(*)
FROM email_alerts WHERE profile_id IS NULL
UNION ALL
SELECT 'groups', COUNT(*)
FROM groups WHERE profile_id IS NULL
UNION ALL
SELECT 'links', COUNT(*)
FROM links WHERE profile_id IS NULL;

-- Check profile context function
SELECT current_setting('app.profile_id', true) as current_profile_context;

-- List all profiles
SELECT id, name, nft_token_id, wallet_address
FROM network_profiles
ORDER BY id; 