import { supabase } from '../config/supabase'

async function checkEmailAlertsSchema() {
  console.log('🔍 Checking email_alerts table schema...')
  
  try {
    // First, let's create a test record to see the schema
    const testData = {
      email: 'schema test',
      recipient: 'test@example.com',
      scheduled_time: new Date().toISOString(),
      sent: false
    }

    const { data: insertData, error: insertError } = await supabase
      .from('email_alerts')
      .insert([testData])
      .select()

    if (insertError) {
      console.error('❌ Insert error:', insertError)
      return
    }

    console.log('✅ Insert successful:', insertData[0])
    console.log('✅ Available fields:', Object.keys(insertData[0]))
    
    // Now let's test with all the fields we think exist
    const fullTestData = {
      email: 'full test',
      recipient: 'test@example.com',
      group_id: null,
      link_id: null,
      note_id: null,
      note_group_id: null,
      scheduled_time: new Date().toISOString(),
      sent: false
    }

    const { data: fullInsertData, error: fullInsertError } = await supabase
      .from('email_alerts')
      .insert([fullTestData])
      .select()

    if (fullInsertError) {
      console.error('❌ Full insert error:', fullInsertError)
    } else {
      console.log('✅ Full insert successful:', fullInsertData[0])
    }

    // Clean up both test records
    if (insertData[0]) {
      await supabase
        .from('email_alerts')
        .delete()
        .eq('id', insertData[0].id)
    }
    if (fullInsertData && fullInsertData[0]) {
      await supabase
        .from('email_alerts')
        .delete()
        .eq('id', fullInsertData[0].id)
    }
    console.log('✅ Test data cleaned up')

  } catch (err) {
    console.error('❌ Exception:', err)
  }
}

checkEmailAlertsSchema()
  .then(() => console.log('\n🎉 Schema check completed!'))
  .catch(err => console.error('❌ Schema check failed:', err)) 