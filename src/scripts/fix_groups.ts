import { supabase } from '../config/supabase'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function fixGroups() {
  try {
    console.log('🔧 Starting group fixes...')

    // Read and execute fix_group_isolation.sql
    console.log('📝 Applying group isolation fixes...')
    const isolationSql = fs.readFileSync(
      path.join(__dirname, 'fix_group_isolation.sql'),
      'utf8'
    )
    await supabase.rpc('executeRawSQL', { sql: isolationSql })
    console.log('✅ Group isolation fixes applied')

    // Read and execute restore_bleh_group.sql
    console.log('🔄 Restoring Bleh profile group...')
    const restoreSql = fs.readFileSync(
      path.join(__dirname, 'restore_bleh_group.sql'),
      'utf8'
    )
    await supabase.rpc('executeRawSQL', { sql: restoreSql })
    console.log('✅ Bleh profile group restored')

    // Verify the changes
    const { data: groups, error } = await supabase
      .from('groups')
      .select('name, profile_id')
      .eq('name', 'hello')
    
    if (error) throw error

    console.log('📊 Current groups named "hello":', groups)
    console.log('✨ All fixes completed successfully')

  } catch (error) {
    console.error('❌ Error fixing groups:', error)
    process.exit(1)
  }
}

fixGroups() 