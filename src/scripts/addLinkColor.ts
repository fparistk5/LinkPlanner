import { supabase } from '../config/supabase'

async function addLinkColor() {
  try {
    // Add color column to links table with a default value
    const { error } = await supabase.rpc('add_link_color_column')

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