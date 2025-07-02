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

-- Check if new columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'network_profiles'
AND column_name IN ('token_id', 'token_address', 'contract_address');

-- Check if indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'network_profiles'
AND indexname IN (
  'idx_network_profiles_contract_address',
  'idx_network_profiles_token_address',
  'idx_network_profiles_token_lookup'
);

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'network_profiles';

-- Check if policies exist
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'network_profiles';

-- Check if functions exist
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN (
  'check_profile_limit_per_nft',
  'validate_token_ownership',
  'get_nft_profile_count',
  'can_create_profile_for_nft'
);

-- Check if view exists
SELECT viewname, definition 
FROM pg_views
WHERE viewname = 'profile_token_info'; 