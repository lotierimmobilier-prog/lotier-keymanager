import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

async function sendTwilioSms(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !fromPhone) {
      return { success: false, error: 'Configuration Twilio manquante' };
    }

    const cleanPhone = to.replace(/[\s.\-]/g, '');

    const internationalPhone = cleanPhone.startsWith('0')
      ? '+33' + cleanPhone.substring(1)
      : cleanPhone.startsWith('+') ? cleanPhone : '+33' + cleanPhone;

    const auth = btoa(`${accountSid}:${authToken}`);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const body = new URLSearchParams({
      To: internationalPhone,
      From: fromPhone,
      Body: message,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erreur Twilio SMS:', errorData);

      let errorMessage = `Erreur Twilio: ${response.status}`;

      if (errorData.includes('"code":21608')) {
        errorMessage = `Le numéro ${to} n'est pas vérifié. En mode essai Twilio, vous devez vérifier les numéros sur twilio.com/console/phone-numbers/verified avant d'envoyer des SMS.`;
      } else {
        try {
          const errorJson = JSON.parse(errorData);
          errorMessage = errorJson.message || errorData;
        } catch {
          errorMessage = errorData;
        }
      }

      return { success: false, error: errorMessage };
    }

    return { success: true };
  } catch (error) {
    console.error('Exception lors de l\'envoi du SMS:', error);
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
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

    const result = await sendTwilioSms(to, message);

    const logData = {
      agency_id: agencyId,
      contact_id: contactId || null,
      movement_id: movementId || null,
      type,
      to_phone: to,
      message,
      status: result.success ? 'sent' : 'error',
      error_message: result.error || null,
    };

    const { error: logError } = await supabaseClient
      .from('sms_logs')
      .insert(logData);

    if (logError) {
      console.error('Erreur lors de l\'enregistrement du log SMS:', logError);
    }

    return new Response(
      JSON.stringify({ success: result.success, error: result.error }),
      {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Erreur dans send-sms:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { createClient } from 'npm:@supabase/supabase-js@2';