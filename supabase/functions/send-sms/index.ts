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
  if (clean.startsWith('0')) return '+33' + clean.substring(1);
  if (clean.startsWith('+')) return clean;
  return '+33' + clean;
}

async function sendOvhSms(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  const appKey = Deno.env.get('OVH_APP_KEY');
  const appSecret = Deno.env.get('OVH_APP_SECRET');
  const consumerKey = Deno.env.get('OVH_CONSUMER_KEY');
  const serviceName = Deno.env.get('OVH_SMS_ACCOUNT');
  const sender = Deno.env.get('OVH_SMS_SENDER');

  if (!appKey || !appSecret || !consumerKey || !serviceName) {
    return { success: false, error: 'Configuration OVH manquante (OVH_APP_KEY, OVH_APP_SECRET, OVH_CONSUMER_KEY, OVH_SMS_ACCOUNT)' };
  }

  const phone = formatPhone(to);

  // Récupérer le timestamp serveur OVH pour éviter les décalages
  let timestamp: string;
  try {
    const timeRes = await fetch('https://eu.api.ovh.com/1.0/auth/time');
    const serverTime = await timeRes.json();
    timestamp = serverTime.toString();
  } catch {
    timestamp = Math.floor(Date.now() / 1000).toString();
  }

  const url = `https://eu.api.ovh.com/1.0/sms/${serviceName}/jobs`;
  const bodyObj: Record<string, unknown> = {
    message,
    receivers: [phone],
    noStopClause: false,
    senderForResponse: !sender,
  };
  if (sender) bodyObj.sender = sender;

  const body = JSON.stringify(bodyObj);

  // Signature OVH : $1$SHA1(appSecret+consumerKey+method+url+body+timestamp)
  const sigPayload = `${appSecret}+${consumerKey}+POST+${url}+${body}+${timestamp}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-1', encoder.encode(sigPayload));
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const signature = `$1$${hashHex}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ovh-Application': appKey,
        'X-Ovh-Consumer': consumerKey,
        'X-Ovh-Timestamp': timestamp,
        'X-Ovh-Signature': signature,
      },
      body,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Erreur OVH SMS:', errText);
      let errMsg = `Erreur OVH: ${response.status}`;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.message || errJson.class || errText;
      } catch {
        errMsg = errText;
      }
      return { success: false, error: errMsg };
    }

    return { success: true };
  } catch (error) {
    console.error('Exception OVH SMS:', error);
    return { success: false, error: (error as Error).message };
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
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { to, message, movementId, contactId, agencyId, type }: SendSmsRequest = await req.json();

    if (!to || !message || !agencyId || !type) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await sendOvhSms(to, message);

    const { error: logError } = await supabaseClient
      .from('sms_logs')
      .insert({
        agency_id: agencyId,
        contact_id: contactId || null,
        movement_id: movementId || null,
        type,
        to_phone: to,
        message,
        status: result.success ? 'sent' : 'error',
        error_message: result.error || null,
      });

    if (logError) {
      console.error('Erreur log SMS:', logError);
    }

    return new Response(
      JSON.stringify({ success: result.success, error: result.error }),
      {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erreur dans send-sms:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
