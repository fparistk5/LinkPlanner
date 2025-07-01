-- Check if functions exist
SELECT 
    proname as function_name,
    proargnames as argument_names,
    prosrc as function_source
FROM pg_proc 
WHERE proname IN ('set_profile_context', 'enforce_profile_isolation');

-- Check if triggers exist
SELECT 
    tgname as trigger_name,
    relname as table_name,
    proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE relname IN ('notes', 'email_alerts', 'groups', 'links');

-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('notes', 'email_alerts', 'groups', 'links');

-- Check existing profiles
SELECT id, name, nft_token_id, wallet_address
FROM network_profiles
ORDER BY id;

-- Check data distribution
SELECT 
    'notes' as table_type,
    COUNT(*) as total_count,
    array_agg(DISTINCT profile_id) as profile_ids
FROM notes
UNION ALL
SELECT 
    'email_alerts',
    COUNT(*),
    array_agg(DISTINCT profile_id)
FROM email_alerts
UNION ALL
SELECT 
    'groups',
    COUNT(*),
    array_agg(DISTINCT profile_id)
FROM groups
UNION ALL
SELECT 
    'links',
    COUNT(*),
    array_agg(DISTINCT profile_id)
FROM links; 