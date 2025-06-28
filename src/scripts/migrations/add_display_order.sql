-- Create the stored procedure
CREATE OR REPLACE FUNCTION add_display_order_column()
RETURNS void AS $$
BEGIN
  -- Add display_order column to groups table with a default value
  ALTER TABLE public.groups 
  ADD COLUMN IF NOT EXISTS display_order FLOAT DEFAULT 0 NOT NULL;

  -- Update existing groups with incremental display_order values
  WITH indexed_groups AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) * 1000 as new_order
    FROM public.groups
  )
  UPDATE public.groups g
  SET display_order = ig.new_order
  FROM indexed_groups ig
  WHERE g.id = ig.id;
END;
$$ LANGUAGE plpgsql; 