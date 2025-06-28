import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://flvydpjkjcxaqhyevszi.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdnlkcGpramN4YXFoeWV2c3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDkzMDksImV4cCI6MjA2NDEyNTMwOX0.lYbXedS5q_tXtyaKBA6MRlQUvqefiRIFEddCGSLsEqQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkEmailTable() {
  console.log('🔍 Checking email_alerts table...')
  
  try {
    // Try to query the email_alerts table
    const { data, error } = await supabase
      .from('email_alerts')
      .select('*')
      .limit(1)
    
    if (error) {
      console.log('❌ email_alerts table does not exist:', error.message)
      console.log('📝 You need to create the table in your Supabase dashboard')
      console.log('')
      console.log('🛠️  CREATE TABLE SQL:')
      console.log(`
CREATE TABLE public.email_alerts (
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

-- Enable Row Level Security
ALTER TABLE public.email_alerts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed)
CREATE POLICY "Allow all operations on email_alerts" ON public.email_alerts
FOR ALL USING (true);
      `)
      console.log('')
      console.log('🌐 Go to: https://supabase.com/dashboard/project/flvydpjkjcxaqhyevszi/editor')
      console.log('📝 Run the SQL above in the SQL Editor')
    } else {
      console.log('✅ email_alerts table exists!')
      console.log(`📊 Found ${data?.length || 0} sample records`)
      
      // Try to insert a test record
      const testAlert = {
        email: 'Test verification email',
        recipient: 'test@example.com',
        scheduled_time: new Date().toISOString(),
        sent: false
      }
      
      const { data: insertData, error: insertError } = await supabase
        .from('email_alerts')
        .insert([testAlert])
        .select()
      
      if (insertError) {
        console.log('⚠️  Table exists but insert failed:', insertError.message)
        console.log('This might be due to permissions or missing columns')
      } else {
        console.log('✅ Table works! Successfully inserted test record')
        
        // Clean up test record
        await supabase
          .from('email_alerts')
          .delete()
          .eq('id', insertData[0].id)
        console.log('🧹 Test record cleaned up')
      }
    }
  } catch (err) {
    console.error('❌ Error checking table:', err)
  }
}

checkEmailTable() 