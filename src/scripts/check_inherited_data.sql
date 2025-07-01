-- Check table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notes';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'email_alerts';

-- Check profile information
SELECT id, name, nft_token_id 
FROM network_profiles 
ORDER BY id;

-- Check raw notes data
SELECT * FROM notes LIMIT 5;

-- Check raw email alerts data
SELECT * FROM email_alerts LIMIT 5;

-- Check notes distribution
SELECT n.id, n.title, n.profile_id, np.name as profile_name
FROM notes n
JOIN network_profiles np ON n.profile_id = np.id
ORDER BY n.profile_id;

-- Check email alerts distribution
SELECT ea.id, ea.title, ea.profile_id, np.name as profile_name
FROM email_alerts ea
JOIN network_profiles np ON ea.profile_id = np.id
ORDER BY ea.profile_id;

-- Check if there are any notes or alerts without profile_id
SELECT 'notes' as table_name, COUNT(*) as count_null_profile_id
FROM notes
WHERE profile_id IS NULL
UNION ALL
SELECT 'email_alerts' as table_name, COUNT(*) as count_null_profile_id
FROM email_alerts
WHERE profile_id IS NULL; 