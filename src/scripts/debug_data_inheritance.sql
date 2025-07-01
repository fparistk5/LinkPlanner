-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('notes', 'email_alerts', 'groups', 'links');

-- Check existing policies
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('notes', 'email_alerts', 'groups', 'links');

-- Check data in groups
SELECT g.id, g.name, g.profile_id, np.name as profile_name
FROM groups g
LEFT JOIN network_profiles np ON g.profile_id = np.id
ORDER BY g.profile_id;

-- Check data in links
SELECT l.id, l.title, l.profile_id, np.name as profile_name
FROM links l
LEFT JOIN network_profiles np ON l.profile_id = np.id
ORDER BY l.profile_id;

-- Check data in notes
SELECT n.id, n.title, n.group_id, g.profile_id as group_profile_id
FROM notes n
LEFT JOIN groups g ON n.group_id = g.id
ORDER BY g.profile_id;

-- Check data in email_alerts
SELECT ea.id, ea.email, ea.group_id, g.profile_id as group_profile_id
FROM email_alerts ea
LEFT JOIN groups g ON ea.group_id = g.id
ORDER BY g.profile_id; 