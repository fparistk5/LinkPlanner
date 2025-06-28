import React, { useState, useEffect } from 'react'

export function EmailStatus() {
  const [status, setStatus] = useState({
    supabase: 'checking',
    emailjs: 'checking',
    browser: 'ready'
  })

  useEffect(() => {
    checkEmailStatus()
  }, [])

  const checkEmailStatus = async () => {
    // Check Supabase function
    try {
      const response = await fetch('https://flvydpjkjcxaqhyevszi.supabase.co/functions/v1/send-email', {
        method: 'OPTIONS'
      })
      setStatus(prev => ({ 
        ...prev, 
        supabase: response.ok ? 'ready' : 'needs-setup' 
      }))
    } catch (error) {
      setStatus(prev => ({ ...prev, supabase: 'needs-setup' }))
    }

    // Check EmailJS config
    const emailjsConfigured = 
      localStorage.getItem('emailjs_configured') === 'true' ||
      window.location.search.includes('emailjs=configured')
    
    setStatus(prev => ({ 
      ...prev, 
      emailjs: emailjsConfigured ? 'ready' : 'needs-setup' 
    }))
  }

  const getStatusIcon = (serviceStatus: string) => {
    switch (serviceStatus) {
      case 'ready': return '✅'
      case 'checking': return '🔄'
      case 'needs-setup': return '⚠️'
      default: return '❓'
    }
  }

  const getStatusText = (serviceStatus: string) => {
    switch (serviceStatus) {
      case 'ready': return 'Ready'
      case 'checking': return 'Checking...'
      case 'needs-setup': return 'Needs Setup'
      default: return 'Unknown'
    }
  }

  return (
    <div style={{
      background: '#1e293b',
      border: '1px solid #475569',
      borderRadius: 6,
      padding: 8,
      marginBottom: 12,
      fontSize: 12
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: 6, color: '#60a5fa' }}>
        📧 Email Service Status
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
        <div>
          {getStatusIcon(status.supabase)} Supabase: {getStatusText(status.supabase)}
        </div>
        <div>
          {getStatusIcon(status.emailjs)} EmailJS: {getStatusText(status.emailjs)}
        </div>
        <div>
          {getStatusIcon(status.browser)} Browser: {getStatusText(status.browser)}
        </div>
      </div>
      {(status.supabase === 'needs-setup' && status.emailjs === 'needs-setup') && (
        <div style={{ 
          marginTop: 6, 
          padding: 4, 
          background: '#0f172a', 
          borderRadius: 3,
          color: '#94a3b8',
          fontSize: 10
        }}>
          📝 Complete Resend or EmailJS setup for automatic emails
        </div>
      )}
    </div>
  )
} 