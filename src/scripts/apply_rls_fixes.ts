import { supabase } from '../config/supabase'

async function applyRLSFixes() {
  try {
    console.log('🔒 Applying RLS fixes...')

    // Enable RLS on all tables
    const tables = ['notes', 'email_alerts', 'groups', 'links']
    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(1)
      if (error?.message?.includes('permission denied')) {
        console.log(`✅ RLS already enabled on ${table}`)
      } else {
        console.log(`Enabling RLS on ${table}...`)
        await supabase.rpc('enable_rls_on_table', { table_name: table })
      }
    }

    // Create profile context function
    console.log('Creating profile context function...')
    await supabase.rpc('create_profile_context_function')

    // Create isolation trigger function
    console.log('Creating isolation trigger function...')
    await supabase.rpc('create_isolation_trigger')

    // Create RLS policies
    console.log('Creating RLS policies...')
    await supabase.rpc('create_rls_policies')

    // Create triggers
    console.log('Creating triggers...')
    await supabase.rpc('create_isolation_triggers')

    console.log('✅ RLS fixes applied successfully')

    // Verify the changes
    console.log('🔍 Verifying changes...')

    // Test creating a group with profile context
    const testProfileId = 999 // Use a test profile ID
    await supabase.rpc('set_profile_context', { profile_id: testProfileId })

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert([{
        name: 'Test Group',
        color: '#000000',
        display_order: 1,
        profile_id: 1 // Try to set a different profile_id
      }])
      .select()
      .single()

    if (groupError) {
      console.error('❌ Group creation test failed:', groupError)
      throw groupError
    }

    console.log('✅ Group created:', group)
    if (group.profile_id === testProfileId) {
      console.log('✅ Profile isolation working - group created with correct profile_id')
    } else {
      throw new Error(`Group created with wrong profile_id: ${group.profile_id}, expected: ${testProfileId}`)
    }

    // Clean up test data
    await supabase.from('groups').delete().eq('id', group.id)

    console.log('✅ All changes verified successfully')
  } catch (error) {
    console.error('❌ Error applying RLS fixes:', error)
    throw error
  }
}

// Run the fixes
applyRLSFixes() 