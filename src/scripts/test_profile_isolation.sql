-- First, let's see what profiles exist
SELECT id, name, nft_token_id FROM network_profiles ORDER BY id;

-- Create a test profile if it doesn't exist
INSERT INTO network_profiles (name, positions, nft_token_id, wallet_address)
SELECT 'Test Profile', '{}', '2', '0xtest'
WHERE NOT EXISTS (
    SELECT 1 FROM network_profiles WHERE name = 'Test Profile'
)
RETURNING id;

-- Get the ID of our test profile
WITH profile_id AS (
    SELECT id FROM network_profiles WHERE name = 'Test Profile'
)
-- Set the profile context
SELECT set_profile_context(id) FROM profile_id;

-- Create a test group for the new profile
WITH profile_id AS (
    SELECT id FROM network_profiles WHERE name = 'Test Profile'
)
INSERT INTO groups (name, color, display_order, profile_id)
SELECT 'Test Group', '#000000', 0, id
FROM profile_id
WHERE NOT EXISTS (
    SELECT 1 FROM groups g
    JOIN network_profiles np ON g.profile_id = np.id
    WHERE np.name = 'Test Profile' AND g.name = 'Test Group'
);

-- Check what each profile can see
WITH profiles AS (
    SELECT id, name FROM network_profiles
)
SELECT 
    p.name as profile_name,
    COUNT(DISTINCT n.id) as notes_count,
    COUNT(DISTINCT ea.id) as email_alerts_count,
    COUNT(DISTINCT g.id) as groups_count
FROM profiles p
LEFT JOIN notes n ON n.profile_id = p.id
LEFT JOIN email_alerts ea ON ea.profile_id = p.id
LEFT JOIN groups g ON g.profile_id = p.id
GROUP BY p.id, p.name
ORDER BY p.id; 