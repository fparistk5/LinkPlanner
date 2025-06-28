const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function addLinkColor() {
  try {
    // Add color column to links table with a default value using direct SQL
    const { error } = await supabase
      .from('_sql')
      .select('*')
      .execute(`
        ALTER TABLE public.links 
        ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6' NOT NULL;
      `)

    if (error) throw error
    console.log('Successfully added color column to links table')
  } catch (err) {
    console.error('Error adding color column:', err)
    throw err
  }
}

// Run the migration
addLinkColor()
  .then(() => console.log('Migration completed'))
  .catch(err => console.error('Migration failed:', err)) 