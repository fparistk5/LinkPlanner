import { supabase } from '../config/supabase'

async function debugEmailAlert() {
  console.log('🔍 Debugging Email Alert Submission...')
  
  // Test the exact data structure from the form
  const testData = {
    email: 'test@example.com',
    group: 'some-group-id', // This might be the issue
    link: 'some-link-id',   // This might be the issue
    note: 'some-note-id',   // This might be the issue
    noteGroup: 'some-note-group-id', // This might be the issue
    time: new Date().toLocaleString(),
    recipient: 'recipient@example.com',
    scheduled_time: new Date().toISOString(),
    sent: false
  }

  console.log('Testing with data:', testData)

  try {
    const { data, error } = await supabase
      .from('email_alerts')
      .insert([testData])
      .select()

    if (error) {
      console.error('❌ Error:', error)
      console.log('Error details:', JSON.stringify(error, null, 2))
    } else {
      console.log('✅ Success:', data)
    }
  } catch (err) {
    console.error('❌ Exception:', err)
  }

  // Test with minimal required fields only
  console.log('\n🔍 Testing with minimal fields...')
  const minimalData = {
    email: 'test@example.com',
    recipient: 'recipient@example.com',
    scheduled_time: new Date().toISOString(),
    sent: false
  }

  console.log('Minimal data:', minimalData)

  try {
    const { data, error } = await supabase
      .from('email_alerts')
      .insert([minimalData])
      .select()

    if (error) {
      console.error('❌ Error with minimal data:', error)
    } else {
      console.log('✅ Success with minimal data:', data)
      
      // Clean up
      await supabase
        .from('email_alerts')
        .delete()
        .eq('id', data[0].id)
      console.log('✅ Cleaned up test data')
    }
  } catch (err) {
    console.error('❌ Exception with minimal data:', err)
  }

  // Check table structure
  console.log('\n🔍 Checking table structure...')
  try {
    const { data, error } = await supabase
      .from('email_alerts')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Error checking structure:', error)
    } else if (data && data.length > 0) {
      console.log('✅ Table structure:', Object.keys(data[0]))
      console.log('Sample record:', data[0])
    } else {
      console.log('ℹ️  Table is empty, checking schema...')
    }
  } catch (err) {
    console.error('❌ Exception checking structure:', err)
  }
}

debugEmailAlert()
  .then(() => console.log('\n🎉 Debug completed!'))
  .catch(err => console.error('❌ Debug failed:', err)) 