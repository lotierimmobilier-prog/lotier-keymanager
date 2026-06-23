import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendSmsRequest {
  to: string;
  message: string;
  movementId?: string;
  contactId?: string;
  agencyId: string;
  type: 'key_taken' | 'key_due_2h' | 'key_overdue';
}

function formatPhone(to: string): string {
  const clean = to.replace(/[\s.\-()/]/g, '');
  if (clean.startsWith('+')) return clean;
  if (clean.startsWith('0')) return '+33' + clean.substring(1);
  return '+33' + clean;
}

async function sendTwilioSms(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from       = Deno.env.get('TWILIO_FROM');

  if (!accountSid || !authToken || !from) {
    return { success: false, error: 'Secrets manquants: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN et TWILIO_FROM requis' };
  }

  const phone = formatPhone(to);
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const body = new URLSearchParams({ To: phone, From: from, Body: message });
  const credentials = btoa(`${accountSid}:${authToken}`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.message ?? `Erreur Twilio ${res.status}` };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { to, message, movementId, contactId, agencyId, type }: SendSmsRequest = await req.json();

    if (!to || !message || !agencyId || !type) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await sendTwilioSms(to, message);

    await supabaseClient.from('sms_logs').insert({
      agency_id: agencyId,
      contact_id: contactId || null,
      movement_id: movementId || null,
      type,
      to_phone: to,
      message,
      status: result.success ? 'sent' : 'error',
      error_message: result.error || null,
    });

    return new Response(
      JSON.stringify({ success: result.success, error: result.error }),
      {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
