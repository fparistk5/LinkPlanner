-- Create the stored procedure
CREATE OR REPLACE FUNCTION add_link_color_column()
RETURNS void AS $$
BEGIN
  -- Add color column to links table with a default value
  ALTER TABLE public.links 
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6' NOT NULL;
END;
$$ LANGUAGE plpgsql; 