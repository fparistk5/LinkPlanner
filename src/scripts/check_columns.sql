-- List all columns for each table
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('notes', 'email_alerts', 'groups', 'links', 'network_profiles')
ORDER BY table_name, ordinal_position; 