-- Add subgroup support to groups table
CREATE OR REPLACE FUNCTION add_subgroups_support()
RETURNS void AS $$
BEGIN
  -- Add parent_group_id column to groups table to support hierarchical structure
  ALTER TABLE public.groups 
  ADD COLUMN IF NOT EXISTS parent_group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;

  -- Create index for better performance on hierarchical queries
  CREATE INDEX IF NOT EXISTS idx_groups_parent_group_id ON public.groups(parent_group_id);
  
  -- Add a check constraint to prevent circular references (a group cannot be its own parent)
  ALTER TABLE public.groups 
  ADD CONSTRAINT IF NOT EXISTS chk_no_self_reference 
  CHECK (parent_group_id != id);

END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT add_subgroups_support();

-- Drop the function after execution
DROP FUNCTION add_subgroups_support(); 