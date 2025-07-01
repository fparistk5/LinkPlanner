-- Check data distribution across profiles
WITH profile_summary AS (
    SELECT 
        p.id as profile_id,
        p.name as profile_name,
        p.nft_token_id,
        COUNT(DISTINCT n.id) as notes_count,
        COUNT(DISTINCT ea.id) as alerts_count,
        COUNT(DISTINCT g.id) as groups_count,
        COUNT(DISTINCT l.id) as links_count
    FROM network_profiles p
    LEFT JOIN notes n ON n.profile_id = p.id
    LEFT JOIN email_alerts ea ON ea.profile_id = p.id
    LEFT JOIN groups g ON g.profile_id = p.id
    LEFT JOIN links l ON l.profile_id = p.id
    GROUP BY p.id, p.name, p.nft_token_id
)
SELECT * FROM profile_summary ORDER BY profile_id;

-- Check RLS status
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('notes', 'email_alerts', 'groups', 'links');

-- Check RLS policies
SELECT 
    schemaname, 
    tablename, 
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('notes', 'email_alerts', 'groups', 'links');

-- Check current profile context
SELECT current_setting('app.profile_id', true) as current_profile_context; 