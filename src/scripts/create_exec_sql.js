import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with direct values
const supabaseUrl = 'https://flvydpjkjcxaqhyevszi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdnlkcGpramN4YXFoeWV2c3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDkzMDksImV4cCI6MjA2NDEyNTMwOX0.lYbXedS5q_tXtyaKBA6MRlQUvqefiRIFEddCGSLsEqQ';

const supabase = createClient(supabaseUrl, supabaseKey);

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