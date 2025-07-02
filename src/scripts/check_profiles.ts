import { supabase } from '../config/supabase'

async function checkProfiles() {
  try {
    console.log('🔍 Checking profiles...')
    
    const { data, error } = await supabase
      .from('network_profiles')
      .select('id, name, created_at')
      .order('id')
    
    if (error) throw error
    
    console.log('📊 Current profiles:', data)

  } catch (error) {
    console.error('❌ Error checking profiles:', error)
    process.exit(1)
  }
}

checkProfiles() 