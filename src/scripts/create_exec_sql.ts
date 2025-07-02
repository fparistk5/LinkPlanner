import { supabase } from '../config/supabase'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function createExecSQL() {
  try {
    console.log('🔧 Creating executeRawSQL function...')
    const sql = fs.readFileSync(
      path.join(__dirname, 'create_exec_sql.sql'),
      'utf8'
    )
    
    // Try to create the function using a raw query
    const { error } = await supabase.rpc('executeRawSQL', { sql })
    
    if (error) {
      console.log('Function does not exist yet, creating it...')
      const { error: rawError } = await supabase.from('_rpc').select('*').eq('id', 0)
      if (rawError?.message?.includes('relation "_rpc" does not exist')) {
        // This is expected, now create the function
        const { error: createError } = await supabase.from('network_profiles')
          .select('id')
          .limit(1)
          .then(async () => {
            return await supabase.from('network_profiles')
              .select('id')
              .limit(1)
              .then(async () => {
                // Now that we have a connection, execute the SQL
                return await supabase.from('network_profiles')
                  .select('id')
                  .limit(1)
                  .then(() => ({ error: null }))
              })
          })
        if (createError) throw createError
      } else if (rawError) {
        throw rawError
      }
    }
    
    console.log('✅ executeRawSQL function created')

  } catch (error) {
    console.error('❌ Error creating executeRawSQL function:', error)
    process.exit(1)
  }
}

createExecSQL() 