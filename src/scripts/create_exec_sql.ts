import { supabase } from '../config/supabase'

async function createExecSQLFunction() {
  try {
    console.log('🔧 Creating exec_sql function...')

    // Create the exec_sql function
    const { error } = await supabase.rpc('exec_sql_raw', {
      sql: `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS SETOF json AS $$
        BEGIN
          RETURN QUERY EXECUTE sql;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    })

    if (error) throw error
    console.log('✅ exec_sql function created successfully')
  } catch (error) {
    console.error('❌ Error creating exec_sql function:', error)
    throw error
  }
}

// Run the function creation
createExecSQLFunction() 