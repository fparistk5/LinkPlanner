import { supabase } from '../config/supabase'

async function testEmailAlerts() {
  try {
    console.log('Testing Email Alerts functionality...')
    
    // Check existing email alerts
    const { data: existingAlerts, error: fetchError } = await supabase
      .from('email_alerts')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (fetchError) {
      console.error('Error fetching email alerts:', fetchError)
      return
    }

    console.log(`Found ${existingAlerts?.length || 0} existing email alerts:`)
    
    if (existingAlerts && existingAlerts.length > 0) {
      existingAlerts.forEach((alert, index) => {
        console.log(`${index + 1}. Email: ${alert.email}`)
        console.log(`   Recipient: ${alert.recipient}`)
        console.log(`   Scheduled: ${alert.scheduled_time}`)
        console.log(`   Sent: ${alert.sent}`)
        console.log(`   Created: ${alert.created_at}`)
        console.log('---')
      })
    } else {
      console.log('No existing email alerts found.')
    }

    // Test creating a new email alert
    console.log('\nTesting creation of a new email alert...')
    
    const testAlert = {
      email: 'test@example.com',
      recipient: 'recipient@example.com',
      group_id: null,
      link_id: null,
      note_id: null,
      note_group_id: null,
      scheduled_time: new Date().toISOString(),
      sent: false
    }

    const { data: newAlert, error: insertError } = await supabase
      .from('email_alerts')
      .insert([testAlert])
      .select()
      .single()

    if (insertError) {
      console.error('Error creating test email alert:', insertError)
    } else {
      console.log('✅ Successfully created test email alert:', newAlert)
      
      // Clean up - delete the test alert
      const { error: deleteError } = await supabase
        .from('email_alerts')
        .delete()
        .eq('id', newAlert.id)
      
      if (deleteError) {
        console.error('Error deleting test alert:', deleteError)
      } else {
        console.log('✅ Test alert cleaned up successfully')
      }
    }

    // Test email sending function (if available)
    console.log('\nTesting email sending function...')
    try {
      const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: 'test@example.com',
          subject: 'Test Email',
          html: '<h1>Test Email</h1><p>This is a test email from Supabase.</p>'
        }
      })

      if (emailError) {
        console.log('Email function not available or not configured:', emailError.message)
        console.log('To set up email sending, you need to:')
        console.log('1. Deploy the send-email edge function')
        console.log('2. Configure RESEND_API_KEY in Supabase secrets')
        console.log('3. Verify your sender email domain')
      } else {
        console.log('✅ Email function working:', emailResult)
      }
    } catch (funcError) {
      console.log('Email function not available (this is normal if not deployed)')
    }

  } catch (error) {
    console.error('Email alerts test failed:', error)
  }
}

testEmailAlerts()
  .then(() => console.log('Email alerts test completed'))
  .catch(err => console.error('Email alerts test failed:', err)) 