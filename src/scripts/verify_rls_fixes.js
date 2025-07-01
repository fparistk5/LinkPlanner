import { createClient } from '@supabase/supabase-js';

// Use the same configuration as the main app
const supabaseUrl = 'https://flvydpjkjcxaqhyevszi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdnlkcGpramN4YXFoeWV2c3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDkzMDksImV4cCI6MjA2NDEyNTMwOX0.lYbXedS5q_tXtyaKBA6MRlQUvqefiRIFEddCGSLsEqQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyIsolation() {
  try {
    // Get all profiles for reference
    const { data: profiles, error: profilesError } = await supabase
      .from('network_profiles')
      .select('id, name');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }

    const profileMap = new Map(profiles.map(p => [p.id, p.name]));

    // Check data distribution for each table
    const tables = ['notes', 'email_alerts', 'groups', 'links'];
    
    for (const table of tables) {
      console.log(`\n🔍 Checking ${table}...`);
      
      const { data, error } = await supabase
        .from(table)
        .select('profile_id');

      if (error) {
        console.error(`Error checking ${table}:`, error);
        continue;
      }

      // Group by profile_id and count
      const distribution = data.reduce((acc, row) => {
        const profileName = profileMap.get(row.profile_id) || 'Unknown Profile';
        const key = `${profileName} (ID: ${row.profile_id})`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      console.log(`Distribution in ${table}:`, distribution);
    }

  } catch (error) {
    console.error('Error during verification:', error);
  }
}

verifyIsolation(); 