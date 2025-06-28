import { supabase } from '../config/supabase'

async function createEmailAlertsTable() {
  try {
    // Check if table already exists
    const { data: tableExists, error } = await supabase.rpc('table_exists', { table_name: 'email_alerts' });
    if (error) {
      console.error('Error checking if table exists:', error);
      // Fallback to creating the table anyway
    } else if (tableExists) {
      console.log('email_alerts table already exists');
      return;
    }

    // Create email_alerts table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.email_alerts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email TEXT NOT NULL,
        recipient TEXT NOT NULL,
        group_id UUID,
        link_id UUID,
        note_id UUID,
        note_group_id UUID,
        scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
        sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    const { data: createData, error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    if (createError) {
      console.error('Error creating email_alerts table:', createError);
      // Fallback to direct creation if RPC is not available
      console.log('Attempting direct table creation...');
      // Note: Supabase JS client doesn't support direct schema changes, so this is a placeholder
      throw new Error('Direct table creation not supported via JS client. Please create the table manually in Supabase dashboard.');
    } else {
      console.log('email_alerts table created successfully:', createData);
    }
  } catch (err) {
    console.error('Error in migration:', err);
    throw err;
  }
}

// Run the migration
createEmailAlertsTable()
  .then(() => console.log('Migration completed'))
  .catch(err => console.error('Migration failed:', err)); 