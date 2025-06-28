import React from 'react'
import { sendEmail } from '../services/emailService'

export function EmailTestButton() {
  const handleTest = async () => {
    console.log('🧪 Starting comprehensive email test...')
    
    // Test the email service
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Email Test from Web Organizer',
      message: 'This is a test email to verify email functionality is working.',
      alertDetails: {
        scheduledTime: new Date().toLocaleString(),
        groupName: 'Test Group',
        linkTitle: 'Test Link',
        noteName: 'Test Note'
      }
    })

    console.log('📧 Email test result:', result)
    
    if (result.success) {
      if (result.method === 'Supabase Edge Function') {
        alert(`🎉 SUCCESS! Emails are working via Supabase + Resend!\n\nMethod: ${result.method}`)
      } else if (result.method === 'EmailJS') {
        alert(`🎉 SUCCESS! Emails are working via EmailJS!\n\nMethod: ${result.method}`)
      } else if (result.method === 'Browser Email Client') {
        alert(`✅ Email client opened successfully!\n\nMethod: ${result.method}\n\nThis always works but requires manual sending. For automatic emails, set up Resend or EmailJS.`)
      }
    } else {
      alert(`❌ Email test failed: ${result.error}`)
    }
  }

  return (
    <button
      onClick={handleTest}
      style={{
        background: '#3b82f6',
        color: '#fff',
        border: 'none',
        borderRadius: 4,
        padding: '6px 12px',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 'bold'
      }}
    >
      🧪 Test Emails
    </button>
  )
} 