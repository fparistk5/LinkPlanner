import emailjs from '@emailjs/browser'
import { supabase } from '../config/supabase'

// EmailJS Configuration (Free tier - 200 emails/month)
const EMAILJS_SERVICE_ID = 'service_gmail'  // Will be configured
const EMAILJS_TEMPLATE_ID = 'template_alerts'  // Will be configured  
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY'  // Will be configured

// Interface for email data
interface EmailData {
  to: string
  subject: string
  message: string
  alertDetails?: {
    scheduledTime?: string
    groupName?: string
    linkTitle?: string
    noteName?: string
    noteContent?: string
  }
}

// Initialize EmailJS
function initEmailJS() {
  try {
    emailjs.init(EMAILJS_PUBLIC_KEY)
    return true
  } catch (error) {
    console.error('EmailJS initialization failed:', error)
    return false
  }
}

// Send email via EmailJS (immediate backup solution)
async function sendViaEmailJS(emailData: EmailData): Promise<boolean> {
  try {
    const templateParams = {
      to_email: emailData.to,
      subject: emailData.subject,
      message: emailData.message,
      from_name: 'Web Organizer App',
      to_name: emailData.to.split('@')[0], // Use email prefix as name
      scheduled_time: emailData.alertDetails?.scheduledTime || 'Now',
      group_name: emailData.alertDetails?.groupName || 'None',
      link_title: emailData.alertDetails?.linkTitle || 'None',
      note_name: emailData.alertDetails?.noteName || 'None',
      note_content: emailData.alertDetails?.noteContent || 'None'
    }

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    )

    console.log('✅ EmailJS success:', response.status, response.text)
    return true
  } catch (error) {
    console.error('❌ EmailJS failed:', error)
    return false
  }
}

// Send email via Supabase Edge Function
async function sendViaSupabase(emailData: EmailData): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: emailData.to,
        subject: emailData.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; text-align: left;">
            <h2 style="color: #333; margin: 0 0 20px 0; text-align: left;">WebMind Alert: ${emailData.message}</h2>
            
            <p style="margin: 0 0 10px 0; font-size: 16px; text-align: left;"><strong>Message:</strong> ${emailData.message}</p>
            ${emailData.alertDetails?.scheduledTime ? `<p style="margin: 0 0 20px 0; color: #666; text-align: left;"><strong>Scheduled for:</strong> ${emailData.alertDetails.scheduledTime}</p>` : '<br/>'}

            <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; text-align: left;">Related Items</p>
            ${emailData.alertDetails?.groupName ? `<p style="margin: 0 0 5px 0; text-align: left;">📁 Group: ${emailData.alertDetails.groupName}</p>` : ''}
            ${emailData.alertDetails?.linkTitle ? `<p style="margin: 0 0 5px 0; text-align: left;">🔗 Link: ${emailData.alertDetails.linkTitle}</p>` : ''}
            ${emailData.alertDetails?.noteName ? `<p style="margin: 0 0 5px 0; text-align: left;">📝 Note: ${emailData.alertDetails.noteName}</p>` : ''}
            ${emailData.alertDetails?.noteContent ? `
            <p style="margin: 10px 0 5px 0; text-align: left;">📝 Note Content:</p>
            <div style="margin: 0 0 20px 0; padding: 10px; background: #f8f9fa; border-left: 3px solid #007bff; white-space: pre-wrap; text-align: left;">${emailData.alertDetails.noteContent}</div>
            ` : ''}

            <p style="text-align: left; margin: 20px 0; color: #666;">...</p>
            <p style="color: #666; font-size: 12px; text-align: left; margin: 0;">"Sent from Web Organizer App"</p>
          </div>
        `
      }
    })

    if (error) {
      console.error('❌ Supabase email function error:', error)
      return false
    }

    console.log('✅ Supabase email success:', data)
    return true
  } catch (error) {
    console.error('❌ Supabase email exception:', error)
    return false
  }
}

// Browser-based email fallback (opens default email client)
function sendViaBrowser(emailData: EmailData): boolean {
  try {
    const subject = encodeURIComponent(emailData.subject)
    const body = encodeURIComponent(`
${emailData.message}

${emailData.alertDetails?.scheduledTime ? `Scheduled for: ${emailData.alertDetails.scheduledTime}` : ''}
${emailData.alertDetails?.groupName ? `Group: ${emailData.alertDetails.groupName}` : ''}
${emailData.alertDetails?.linkTitle ? `Related Link: ${emailData.alertDetails.linkTitle}` : ''}
${emailData.alertDetails?.noteName ? `Related Note: ${emailData.alertDetails.noteName}` : ''}
${emailData.alertDetails?.noteContent ? `\nNote Content:\n${emailData.alertDetails.noteContent}` : ''}

---
Sent from Web Organizer App
    `.trim())

    const mailtoUrl = `mailto:${emailData.to}?subject=${subject}&body=${body}`
    window.open(mailtoUrl, '_blank')
    
    console.log('✅ Browser email client opened')
    return true
  } catch (error) {
    console.error('❌ Browser email failed:', error)
    return false
  }
}

// Main email sending function with fallbacks
export async function sendEmail(emailData: EmailData): Promise<{
  success: boolean
  method: string
  error?: string
}> {
  console.log('📧 Attempting to send email to:', emailData.to)
  
  // Method 1: Try Supabase Edge Function first (most reliable if configured)
  console.log('🔄 Trying Supabase email function...')
  const supabaseSuccess = await sendViaSupabase(emailData)
  if (supabaseSuccess) {
    return { success: true, method: 'Supabase Edge Function' }
  }

  // Method 2: Try EmailJS (good backup option)
  console.log('🔄 Trying EmailJS...')
  if (initEmailJS()) {
    const emailjsSuccess = await sendViaEmailJS(emailData)
    if (emailjsSuccess) {
      return { success: true, method: 'EmailJS' }
    }
  }

  // Method 3: Browser fallback (always works)
  console.log('🔄 Using browser email client fallback...')
  const browserSuccess = sendViaBrowser(emailData)
  if (browserSuccess) {
    return { success: true, method: 'Browser Email Client' }
  }

  return { 
    success: false, 
    method: 'None', 
    error: 'All email methods failed' 
  }
}

// Test email functionality
export async function testEmailFunctionality(): Promise<void> {
  console.log('🧪 Testing email functionality...')
  
  const testEmail: EmailData = {
    to: 'test@example.com',
    subject: 'Email Test from Web Organizer',
    message: 'This is a test email to verify email functionality is working.',
    alertDetails: {
      scheduledTime: new Date().toLocaleString(),
      groupName: 'Test Group',
      linkTitle: 'Test Link',
      noteName: 'Test Note',
      noteContent: 'This is the full content of the test note with detailed information.'
    }
  }

  const result = await sendEmail(testEmail)
  console.log('📧 Email test result:', result)
}

// Quick setup instructions for EmailJS
export function getEmailJSSetupInstructions(): string[] {
  return [
    '📧 EmailJS Setup Instructions:',
    '1. Go to https://www.emailjs.com/',
    '2. Create a free account (200 emails/month)',
    '3. Create an email service (Gmail, Outlook, etc.)',
    '4. Create an email template with these fields:',
    '   - {{to_email}}, {{subject}}, {{message}}, {{from_name}}',
    '   - {{scheduled_time}}, {{group_name}}, {{link_title}}, {{note_name}}',
    '5. Get your Service ID, Template ID, and Public Key',
    '6. Update the constants in this file',
    '7. Your emails will work immediately!'
  ]
} 