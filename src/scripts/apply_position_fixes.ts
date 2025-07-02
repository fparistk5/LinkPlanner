import { supabase } from '../config/supabase'

async function applyPositionFixes() {
  try {
    // First, backup TECHKEYZ's positions
    await supabase.rpc('executeRawSQL', {
      sql: `
        CREATE TEMP TABLE techkeyz_positions AS
        SELECT positions FROM network_profiles WHERE id = 1;
      `
    });

    // Drop existing position-related functions and triggers
    await supabase.rpc('executeRawSQL', {
      sql: `
        DROP TRIGGER IF EXISTS ensure_empty_positions_trigger ON network_profiles;
        DROP FUNCTION IF EXISTS ensure_empty_positions();
        DROP TRIGGER IF EXISTS initialize_new_profile_trigger ON network_profiles;
        DROP FUNCTION IF EXISTS initialize_new_profile();
      `
    });

    // Create new function to handle positions
    await supabase.rpc('executeRawSQL', {
      sql: `
        CREATE OR REPLACE FUNCTION handle_profile_positions()
        RETURNS TRIGGER AS $$
        BEGIN
            -- For new profiles (INSERT), always start with empty positions
            IF TG_OP = 'INSERT' THEN
                NEW.positions = '{}'::jsonb;
            -- For updates, only allow position changes if it's TECHKEYZ (id = 1)
            ELSIF TG_OP = 'UPDATE' AND OLD.id != 1 AND NEW.positions::text != '{}'::text THEN
                -- Keep positions empty for non-TECHKEYZ profiles
                NEW.positions = '{}'::jsonb;
            END IF;
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    // Create the new trigger
    await supabase.rpc('executeRawSQL', {
      sql: `
        CREATE TRIGGER handle_profile_positions_trigger
            BEFORE INSERT OR UPDATE OF positions ON network_profiles
            FOR EACH ROW
            EXECUTE FUNCTION handle_profile_positions();
      `
    });

    // Restore TECHKEYZ's positions and clear others
    await supabase.rpc('executeRawSQL', {
      sql: `
        UPDATE network_profiles np
        SET positions = CASE 
            WHEN np.id = 1 THEN (SELECT positions FROM techkeyz_positions)
            ELSE '{}'::jsonb
        END;
      `
    });

    // Drop the temporary table
    await supabase.rpc('executeRawSQL', {
      sql: `DROP TABLE techkeyz_positions;`
    });

    // Verify the changes
    const { data, error } = await supabase
      .from('network_profiles')
      .select('id, name, positions')
      .in('id', [1, 58])
      .order('id');

    if (error) throw error;

    console.log('Profile positions after fix:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('Error applying position fixes:', error);
    process.exit(1);
  }
}

applyPositionFixes(); 