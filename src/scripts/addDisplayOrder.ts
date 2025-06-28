import { supabase } from '../config/supabase'

async function addDisplayOrder() {
  try {
    // Add display_order column if it doesn't exist
    // This would ideally be a schema change, but Supabase JS client doesn't support direct schema changes
    // We'll proceed to update existing records assuming the column exists or has been added manually

    // Get all groups ordered by created_at
    const { data: groups, error: fetchError } = await supabase
      .from('groups')
      .select('id, created_at')
      .order('created_at', { ascending: true })

    if (fetchError) throw fetchError
    if (!groups) throw new Error('No groups found')

    // Update display_order for each group
    for (let i = 0; i < groups.length; i++) {
      const newOrder = (i + 1) * 1000
      const { error: updateError } = await supabase
        .from('groups')
        .update({ display_order: newOrder })
        .eq('id', groups[i].id)

      if (updateError) throw updateError
    }

    console.log('Successfully updated display_order for groups')
  } catch (err) {
    console.error('Error updating display_order:', err)
    throw err
  }
}

// Run the migration
addDisplayOrder()
  .then(() => console.log('Migration completed'))
  .catch(err => console.error('Migration failed:', err)) 