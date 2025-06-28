import { executeRawSQL } from '../config/supabase'

async function addSubgroupSupport() {
  try {
    console.log('Adding subgroup support to groups table...')
    
    // Add parent_group_id column to groups table
    const sql = `
      -- Add parent_group_id column to groups table
      ALTER TABLE public.groups 
      ADD COLUMN IF NOT EXISTS parent_group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;
      
      -- Create index for better performance
      CREATE INDEX IF NOT EXISTS idx_groups_parent_group_id ON public.groups(parent_group_id);
    `
    
    await executeRawSQL(sql)
    console.log('✅ Successfully added subgroup support to groups table')
    
  } catch (err) {
    console.error('Error:', err)
  }
}

// Run the function
addSubgroupSupport() 