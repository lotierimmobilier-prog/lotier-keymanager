import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

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

    const { data: agency, error: agencyError } = await supabase
      .from("agencies")
      .select("email_provider, email_api_key, email_from_address, email_from_name, email_smtp_host, email_smtp_port, email_smtp_user, email_smtp_pass, email_smtp_secure, name")
      .eq("id", agencyId)
      .single();

    if (agencyError || !agency) {
      return new Response(
        JSON.stringify({ success: false, error: "Agence introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const provider = agency.email_provider || "smtp";
    const fromName = agency.email_from_name || agency.name || "Agence";
    const fromAddress = agency.email_from_address;

    if (!fromAddress) {
      return new Response(
        JSON.stringify({ success: false, error: "Adresse d'expéditeur non configurée" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: { success: boolean; error?: string };

    if (provider === "smtp") {
      if (!agency.email_smtp_host || !agency.email_smtp_user || !agency.email_smtp_pass) {
        return new Response(
          JSON.stringify({ success: false, error: "Configuration SMTP incomplète (host, user, password requis)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      result = await sendViaSmtp({
        host: agency.email_smtp_host,
        port: agency.email_smtp_port || 587,
        secure: agency.email_smtp_secure || false,
        user: agency.email_smtp_user,
        pass: agency.email_smtp_pass,
        from: `${fromName} <${fromAddress}>`,
        to: toName ? `${toName} <${to}>` : to,
        subject,
        html,
      });
    } else if (provider === "resend") {
      if (!agency.email_api_key) {
        return new Response(
          JSON.stringify({ success: false, error: "Clé API Resend manquante" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      result = await sendViaResend({
        apiKey: agency.email_api_key,
        from: `${fromName} <${fromAddress}>`,
        to: toName ? `${toName} <${to}>` : to,
        subject,
        html,
      });
    } else if (provider === "brevo") {
      if (!agency.email_api_key) {
        return new Response(
          JSON.stringify({ success: false, error: "Clé API Brevo manquante" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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

async function sendViaSmtp(opts: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const transporter = nodemailer.createTransport({
      host: opts.host,
      port: opts.port,
      secure: opts.secure,
      auth: { user: opts.user, pass: opts.pass },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: `SMTP error: ${String(err)}` };
  }
}

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
    body: JSON.stringify({ from: opts.from, to: [opts.to], subject: opts.subject, html: opts.html }),
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
    headers: { "api-key": opts.apiKey, "Content-Type": "application/json" },
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
