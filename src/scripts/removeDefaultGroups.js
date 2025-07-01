import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with direct values
const supabaseUrl = 'https://flvydpjkjcxaqhyevszi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdnlkcGpramN4YXFoeWV2c3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDkzMDksImV4cCI6MjA2NDEyNTMwOX0.lYbXedS5q_tXtyaKBA6MRlQUvqefiRIFEddCGSLsEqQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function removeDefaultGroups() {
  try {
    // First, get the IDs of General note groups
    const { data: generalGroups, error: selectError } = await supabase
      .from('note_groups')
      .select('id')
      .eq('name', 'General');

    if (selectError) {
      throw selectError;
    }

    if (generalGroups && generalGroups.length > 0) {
      // Update notes that reference these General note groups
      const generalGroupIds = generalGroups.map(g => g.id);
      
      const { error: updateError } = await supabase
        .from('notes')
        .update({ note_group_id: null })
        .in('note_group_id', generalGroupIds);

      if (updateError) {
        throw updateError;
      }

      // Delete the General note groups
      const { error: deleteError } = await supabase
        .from('note_groups')
        .delete()
        .in('id', generalGroupIds);

      if (deleteError) {
        throw deleteError;
      }

      console.log(`✅ Successfully removed ${generalGroups.length} default General note groups`);
    } else {
      console.log('ℹ️ No General note groups found to remove');
    }
  } catch (error) {
    console.error('❌ Error removing default groups:', error);
    process.exit(1);
  }
}

removeDefaultGroups(); 