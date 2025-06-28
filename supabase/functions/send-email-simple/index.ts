// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Create Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  try {
    const { to, subject, html } = await req.json();

    // Option 1: Send via Supabase Auth (for user invites/notifications)
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(to, {
      data: {
        custom_message: html,
        subject: subject
      },
      redirectTo: `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify`
    });

    if (error) {
      console.error('Supabase email error:', error);
      // Fallback: Log the email content (useful for testing)
      console.log('Email would be sent:', { to, subject, html });
      return new Response(JSON.stringify({ 
        success: true, 
        method: 'logged',
        message: 'Email logged to console' 
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      method: 'supabase-auth',
      data: data 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 