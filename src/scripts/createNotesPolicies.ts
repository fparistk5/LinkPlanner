import { supabase } from '../config/supabase'

async function createNotesPolicies() {
  try {
    // Enable RLS on notes table
    const { error: enableRLSError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;'
    });
    if (enableRLSError) throw enableRLSError;

    // Create policies for authenticated users
    const { error: policiesError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Allow authenticated users to view their own notes
        CREATE POLICY "Users can view their own notes" ON public.notes
          FOR SELECT
          USING (auth.uid() = created_by OR auth.uid() IN (
            SELECT id FROM public.group_members WHERE group_id = notes.group_id
          ));

        -- Allow authenticated users to insert notes
        CREATE POLICY "Users can create notes" ON public.notes
          FOR INSERT
          WITH CHECK (true);

        -- Allow authenticated users to update their own notes
        CREATE POLICY "Users can update their own notes" ON public.notes
          FOR UPDATE
          USING (auth.uid() = created_by OR auth.uid() IN (
            SELECT id FROM public.group_members WHERE group_id = notes.group_id
          ))
          WITH CHECK (auth.uid() = created_by OR auth.uid() IN (
            SELECT id FROM public.group_members WHERE group_id = notes.group_id
          ));

        -- Allow authenticated users to delete their own notes
        CREATE POLICY "Users can delete their own notes" ON public.notes
          FOR DELETE
          USING (auth.uid() = created_by OR auth.uid() IN (
            SELECT id FROM public.group_members WHERE group_id = notes.group_id
          ));
      `
    });
    if (policiesError) throw policiesError;

    console.log('Notes policies created successfully');
  } catch (error: any) {
    console.error('Error creating notes policies:', error.message);
  }
}

createNotesPolicies(); 