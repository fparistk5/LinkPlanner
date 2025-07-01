import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyIsolation() {
  try {
    // Test isolation mechanism
    const { data: testResult, error: testError } = await supabase
      .rpc('test_profile_isolation');
    
    if (testError) throw testError;
    console.log('Isolation Test Result:', testResult);

    // Check RLS status
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .in('tablename', ['notes', 'email_alerts', 'groups', 'links']);

    if (rlsError) throw rlsError;
    console.log('\nRLS Status:', rlsStatus);

    // Check policies
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('schemaname, tablename, policyname')
      .eq('schemaname', 'public')
      .in('tablename', ['notes', 'email_alerts', 'groups', 'links']);

    if (policiesError) throw policiesError;
    console.log('\nPolicies:', policies);

    // Check data distribution
    const tables = ['notes', 'email_alerts', 'groups', 'links'];
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('profile_id, count', { count: 'exact' })
        .select();

      if (error) throw error;
      console.log(`\nData in ${table}:`, data);
    }

  } catch (error) {
    console.error('Error during verification:', error);
  }
}

verifyIsolation(); 