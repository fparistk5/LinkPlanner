import { supabase } from '../config/supabase'

async function testFixedEmailAlert() {
  console.log('🧪 Testing Fixed Email Alert Submission...')
  
  // Test with the corrected field names
  const testData = {
    email: 'Test alert message',
    group_id: null,
    link_id: null,
    note_id: null,
    note_group_id: null,
    time: new Date().toLocaleString(),
    recipient: 'test@example.com',
    scheduled_time: new Date().toISOString(),
    sent: false
  }

  console.log('Testing with corrected data structure:', testData)

  try {
    const { data, error } = await supabase
      .from('email_alerts')
      .insert([testData])
      .select()

    if (error) {
      console.error('❌ Still getting error:', error)
      console.log('Error details:', JSON.stringify(error, null, 2))
    } else {
      console.log('✅ Success! Email alert saved:', data)
      
      // Clean up
      await supabase
        .from('email_alerts')
        .delete()
        .eq('id', data[0].id)
      console.log('✅ Test data cleaned up')
    }
  } catch (err) {
    console.error('❌ Exception:', err)
  }

  // Test with some optional fields populated
  console.log('\n🧪 Testing with optional fields...')
  const testDataWithOptions = {
    email: 'Test alert with options',
    group_id: 'test-group-id',
    link_id: 'test-link-id',
    note_id: 'test-note-id',
    note_group_id: 'test-note-group-id',
    time: new Date().toLocaleString(),
    recipient: 'recipient@example.com',
    scheduled_time: new Date().toISOString(),
    sent: false
  }

  try {
    const { data, error } = await supabase
      .from('email_alerts')
      .insert([testDataWithOptions])
      .select()

    if (error) {
      console.error('❌ Error with optional fields:', error)
    } else {
      console.log('✅ Success with optional fields:', data)
      
      // Clean up
      await supabase
        .from('email_alerts')
        .delete()
        .eq('id', data[0].id)
      console.log('✅ Optional fields test cleaned up')
    }
  } catch (err) {
    console.error('❌ Exception with optional fields:', err)
  }
}

testFixedEmailAlert()
  .then(() => console.log('\n🎉 Fixed email alert test completed!'))
  .catch(err => console.error('❌ Test failed:', err)) 