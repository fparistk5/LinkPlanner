-- Create a function to execute raw SQL
CREATE OR REPLACE FUNCTION executeRawSQL(sql text)
RETURNS json AS $$
BEGIN
    RETURN (SELECT json_agg(t) FROM (EXECUTE sql) t);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 