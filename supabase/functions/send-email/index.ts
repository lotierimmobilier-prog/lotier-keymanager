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
        tls: agency.email_smtp_secure || false,
        user: agency.email_smtp_user,
        pass: agency.email_smtp_pass,
        from: fromAddress,
        fromName,
        to,
        toName: toName || to,
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
      result = await sendViaResend({ apiKey: agency.email_api_key, from: `${fromName} <${fromAddress}>`, to: toName ? `${toName} <${to}>` : to, subject, html });
    } else if (provider === "brevo") {
      if (!agency.email_api_key) {
        return new Response(
          JSON.stringify({ success: false, error: "Clé API Brevo manquante" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      result = await sendViaBrevo({ apiKey: agency.email_api_key, fromEmail: fromAddress, fromName, to, toName: toName || to, subject, html });
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

// ── Native Deno SMTP client ────────────────────────────────────────────────

const enc = new TextEncoder();
const dec = new TextDecoder();

async function smtpRead(conn: Deno.Conn): Promise<string> {
  let full = "";
  const buf = new Uint8Array(4096);
  while (true) {
    const n = await conn.read(buf);
    if (n === null) break;
    full += dec.decode(buf.subarray(0, n));
    // A complete SMTP response ends with a line "NNN <text>\r\n" (space not dash)
    const lines = full.split("\r\n").filter(Boolean);
    if (lines.length > 0 && /^\d{3} /.test(lines[lines.length - 1])) break;
  }
  return full;
}

async function smtpCmd(conn: Deno.Conn, cmd: string): Promise<string> {
  await conn.write(enc.encode(cmd + "\r\n"));
  return smtpRead(conn);
}

function smtpOk(resp: string, ...codes: number[]): boolean {
  const code = parseInt(resp.slice(0, 3), 10);
  return codes.includes(code);
}

async function sendViaSmtp(opts: {
  host: string; port: number; tls: boolean;
  user: string; pass: string;
  from: string; fromName: string;
  to: string; toName: string;
  subject: string; html: string;
}): Promise<{ success: boolean; error?: string }> {
  let conn: Deno.Conn | null = null;

  try {
    if (opts.tls) {
      conn = await Deno.connectTls({ hostname: opts.host, port: opts.port });
    } else {
      conn = await Deno.connect({ hostname: opts.host, port: opts.port, transport: "tcp" });
    }

    // Greeting
    let resp = await smtpRead(conn);
    if (!smtpOk(resp, 220)) throw new Error(`Greeting: ${resp.trim()}`);

    // EHLO
    resp = await smtpCmd(conn, `EHLO keymanager`);
    if (!smtpOk(resp, 250)) throw new Error(`EHLO: ${resp.trim()}`);

    // STARTTLS for plain connections
    if (!opts.tls && resp.includes("STARTTLS")) {
      resp = await smtpCmd(conn, "STARTTLS");
      if (!smtpOk(resp, 220)) throw new Error(`STARTTLS: ${resp.trim()}`);
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: opts.host });
      resp = await smtpCmd(conn, `EHLO keymanager`);
      if (!smtpOk(resp, 250)) throw new Error(`EHLO after TLS: ${resp.trim()}`);
    }

    // AUTH LOGIN
    resp = await smtpCmd(conn, "AUTH LOGIN");
    if (!smtpOk(resp, 334)) throw new Error(`AUTH LOGIN: ${resp.trim()}`);

    resp = await smtpCmd(conn, btoa(opts.user));
    if (!smtpOk(resp, 334)) throw new Error(`Username: ${resp.trim()}`);

    resp = await smtpCmd(conn, btoa(opts.pass));
    if (!smtpOk(resp, 235)) throw new Error(`Password: ${resp.trim()}`);

    // Envelope
    resp = await smtpCmd(conn, `MAIL FROM:<${opts.from}>`);
    if (!smtpOk(resp, 250)) throw new Error(`MAIL FROM: ${resp.trim()}`);

    resp = await smtpCmd(conn, `RCPT TO:<${opts.to}>`);
    if (!smtpOk(resp, 250)) throw new Error(`RCPT TO: ${resp.trim()}`);

    // DATA
    resp = await smtpCmd(conn, "DATA");
    if (!smtpOk(resp, 354)) throw new Error(`DATA: ${resp.trim()}`);

    const boundary = `bound_${Date.now()}`;
    const plainText = opts.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const emailBody = [
      `From: ${opts.fromName} <${opts.from}>`,
      `To: ${opts.toName} <${opts.to}>`,
      `Subject: ${opts.subject}`,
      `Message-ID: <${Date.now()}@keymanager>`,
      `Date: ${new Date().toUTCString()}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      "",
      plainText,
      "",
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      "",
      opts.html,
      "",
      `--${boundary}--`,
      ".",
    ].join("\r\n");

    await conn.write(enc.encode(emailBody + "\r\n"));
    resp = await smtpRead(conn);
    if (!smtpOk(resp, 250)) throw new Error(`Message: ${resp.trim()}`);

    await smtpCmd(conn, "QUIT");
    conn.close();
    return { success: true };
  } catch (err) {
    try { conn?.close(); } catch (_) { /* ignore */ }
    return { success: false, error: `SMTP error: ${String(err)}` };
  }
}

// ── Resend ─────────────────────────────────────────────────────────────────

async function sendViaResend(opts: { apiKey: string; from: string; to: string; subject: string; html: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: opts.from, to: [opts.to], subject: opts.subject, html: opts.html }),
  });
  if (!res.ok) return { success: false, error: `Resend: ${await res.text()}` };
  return { success: true };
}

// ── Brevo ──────────────────────────────────────────────────────────────────

async function sendViaBrevo(opts: { apiKey: string; fromEmail: string; fromName: string; to: string; toName: string; subject: string; html: string }) {
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
  if (!res.ok) return { success: false, error: `Brevo: ${await res.text()}` };
  return { success: true };
}
