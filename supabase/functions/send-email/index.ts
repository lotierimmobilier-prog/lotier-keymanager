import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailPayload {
  agencyId: string;
  to: string;
  toName?: string;
  subject: string;
  html: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: EmailPayload = await req.json();
    const { agencyId, to, toName, subject, html } = body;

    if (!agencyId || !to || !subject || !html) {
      return new Response(
        JSON.stringify({ success: false, error: "Paramètres manquants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch agency email config
    const { data: agency, error: agencyError } = await supabase
      .from("agencies")
      .select("email_provider, email_api_key, email_from_address, email_from_name, name")
      .eq("id", agencyId)
      .single();

    if (agencyError || !agency) {
      return new Response(
        JSON.stringify({ success: false, error: "Agence introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!agency.email_api_key || !agency.email_from_address) {
      return new Response(
        JSON.stringify({ success: false, error: "Configuration email incomplète" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const provider = agency.email_provider || "resend";
    const fromName = agency.email_from_name || agency.name || "Agence";
    const fromAddress = agency.email_from_address;

    let result: { success: boolean; error?: string };

    if (provider === "resend") {
      result = await sendViaResend({
        apiKey: agency.email_api_key,
        from: `${fromName} <${fromAddress}>`,
        to: toName ? `${toName} <${to}>` : to,
        subject,
        html,
      });
    } else if (provider === "brevo") {
      result = await sendViaBrevo({
        apiKey: agency.email_api_key,
        fromEmail: fromAddress,
        fromName,
        to,
        toName: toName || to,
        subject,
        html,
      });
    } else {
      result = { success: false, error: `Fournisseur "${provider}" non supporté` };
    }

    return new Response(
      JSON.stringify(result),
      { status: result.success ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-email error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendViaResend(opts: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: `Resend error: ${err}` };
  }
  return { success: true };
}

async function sendViaBrevo(opts: {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  to: string;
  toName: string;
  subject: string;
  html: string;
}) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": opts.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: opts.fromEmail, name: opts.fromName },
      to: [{ email: opts.to, name: opts.toName }],
      subject: opts.subject,
      htmlContent: opts.html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: `Brevo error: ${err}` };
  }
  return { success: true };
}
