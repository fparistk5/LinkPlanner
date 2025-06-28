import React, { useState } from 'react'

export function EmailSetupInstructions() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div style={{
      background: '#1e293b',
      border: '1px solid #475569',
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
      color: '#f8fafc'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, color: '#3b82f6' }}>📧 Email Setup Instructions</h4>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            background: '#374151',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: 12
          }}
        >
          {isOpen ? 'Hide' : 'Show Setup'}
        </button>
      </div>
      
      {isOpen && (
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: '8px 0', fontSize: 14 }}>
            <strong>Current Status:</strong> Email alerts work with browser fallback. 
            For automatic email sending, follow these steps:
          </p>
          
          <div style={{ background: '#334155', padding: 12, borderRadius: 6, marginBottom: 12 }}>
            <h5 style={{ margin: 0, marginBottom: 8, color: '#60a5fa' }}>Option 1: EmailJS (Recommended - Free)</h5>
            <ol style={{ paddingLeft: 16, fontSize: 13, lineHeight: 1.5 }}>
              <li>Visit <a href="https://www.emailjs.com/" target="_blank" style={{ color: '#60a5fa' }}>emailjs.com</a></li>
              <li>Create a free account (200 emails/month)</li>
              <li>Add an email service (Gmail, Outlook, etc.)</li>
              <li>Create a template with these variables:
                <ul style={{ marginTop: 4 }}>
                  <li><code style={{ background: '#1e293b', padding: '1px 4px', borderRadius: 2 }}>{'{{to_email}}'}</code></li>
                  <li><code style={{ background: '#1e293b', padding: '1px 4px', borderRadius: 2 }}>{'{{subject}}'}</code></li>
                  <li><code style={{ background: '#1e293b', padding: '1px 4px', borderRadius: 2 }}>{'{{message}}'}</code></li>
                  <li><code style={{ background: '#1e293b', padding: '1px 4px', borderRadius: 2 }}>{'{{from_name}}'}</code></li>
                </ul>
              </li>
              <li>Get your Service ID, Template ID, and Public Key</li>
              <li>Update the constants in <code style={{ background: '#1e293b', padding: '1px 4px', borderRadius: 2 }}>src/services/emailService.ts</code></li>
            </ol>
          </div>

          <div style={{ background: '#334155', padding: 12, borderRadius: 6, marginBottom: 12 }}>
            <h5 style={{ margin: 0, marginBottom: 8, color: '#60a5fa' }}>Option 2: Supabase Edge Function</h5>
            <ol style={{ paddingLeft: 16, fontSize: 13, lineHeight: 1.5 }}>
              <li>The function already exists in <code style={{ background: '#1e293b', padding: '1px 4px', borderRadius: 2 }}>supabase/functions/send-email/</code></li>
              <li>Install Supabase CLI: <code style={{ background: '#1e293b', padding: '1px 4px', borderRadius: 2 }}>npm install -g supabase</code></li>
              <li>Login: <code style={{ background: '#1e293b', padding: '1px 4px', borderRadius: 2 }}>supabase login</code></li>
              <li>Deploy: <code style={{ background: '#1e293b', padding: '1px 4px', borderRadius: 2 }}>supabase functions deploy send-email</code></li>
              <li>Get a free Resend API key from <a href="https://resend.com/" target="_blank" style={{ color: '#60a5fa' }}>resend.com</a></li>
              <li>Add <code style={{ background: '#1e293b', padding: '1px 4px', borderRadius: 2 }}>RESEND_API_KEY</code> to Supabase dashboard secrets</li>
            </ol>
          </div>

          <div style={{ background: '#0f172a', padding: 8, borderRadius: 4, border: '1px solid #334155' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
              <strong>Current Fallback:</strong> Opens your default email client with pre-filled message.
              This always works but requires manual sending.
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 