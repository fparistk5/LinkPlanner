import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function removeDefaultGroups() {
  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'migrations', 'remove_default_groups.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      throw error;
    }

    console.log('✅ Successfully removed default General note groups');
  } catch (error) {
    console.error('❌ Error removing default groups:', error);
    process.exit(1);
  }
}

removeDefaultGroups(); 