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

// SMPP v3.4 command IDs
const CMD_BIND_TRANSMITTER      = 0x00000002;
const CMD_BIND_TRANSMITTER_RESP = 0x80000002;
const CMD_SUBMIT_SM             = 0x00000004;
const CMD_SUBMIT_SM_RESP        = 0x80000004;
const CMD_UNBIND                = 0x00000006;

const SMPP_ERRORS: Record<number, string> = {
  0x0D: 'Identifiants SMPP incorrects (system_id / password)',
  0x0E: 'IP non autorisée sur OVH SMPP - ajoutez l\'IP dans les paramètres SMPP OVH',
  0x45: 'Numéro de destination invalide',
  0x58: 'Crédits SMS insuffisants',
};

function cstr(s: string): Uint8Array {
  const enc = new TextEncoder().encode(s);
  const out = new Uint8Array(enc.length + 1);
  out.set(enc);
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

function buildPdu(commandId: number, seqNum: number, body: Uint8Array): Uint8Array {
  const header = new Uint8Array(16);
  const v = new DataView(header.buffer);
  v.setUint32(0, 16 + body.length);
  v.setUint32(4, commandId);
  v.setUint32(8, 0);
  v.setUint32(12, seqNum);
  return concat(header, body);
}

function buildBindTransmitter(systemId: string, password: string): Uint8Array {
  return buildPdu(CMD_BIND_TRANSMITTER, 1, concat(
    cstr(systemId),
    cstr(password),
    cstr(''),                           // system_type
    new Uint8Array([0x34, 0x00, 0x00]), // interface_version=3.4, addr_ton=0, addr_npi=0
    cstr(''),                           // address_range
  ));
}

function buildSubmitSm(sender: string, to: string, message: string, seqNum: number): Uint8Array {
  // UCS-2 BE for full French/Unicode support (70 chars max per SMS segment)
  const text = message.slice(0, 70);
  const msgBytes = new Uint8Array(text.length * 2);
  const dv = new DataView(msgBytes.buffer);
  for (let i = 0; i < text.length; i++) dv.setUint16(i * 2, text.charCodeAt(i));

  // Alphanumeric sender: TON=5, NPI=0 — numeric sender: TON=1, NPI=1
  const isAlpha = /[a-zA-Z]/.test(sender);
  const [srcTon, srcNpi] = isAlpha ? [5, 0] : [1, 1];

  return buildPdu(CMD_SUBMIT_SM, seqNum, concat(
    cstr(''),                          // service_type
    new Uint8Array([srcTon, srcNpi]),   // source TON / NPI
    cstr(sender),                       // source_addr
    new Uint8Array([0x01, 0x01]),       // dest TON=1 (intl), NPI=1 (ISDN/E.164)
    cstr(to),                           // destination_addr (E.164)
    new Uint8Array([0x00, 0x00, 0x00]), // esm_class, protocol_id, priority_flag
    cstr(''),                           // schedule_delivery_time (empty = immediate)
    cstr(''),                           // validity_period (empty = default)
    new Uint8Array([
      0x00,            // registered_delivery (no receipt)
      0x00,            // replace_if_present_flag
      0x08,            // data_coding: UCS-2 BE
      0x00,            // sm_default_msg_id
      msgBytes.length, // sm_length (bytes)
    ]),
    msgBytes,
  ));
}

async function readExact(conn: Deno.TcpConn | Deno.TlsConn, n: number): Promise<Uint8Array | null> {
  const buf = new Uint8Array(n);
  let read = 0;
  while (read < n) {
    const chunk = await conn.read(buf.subarray(read));
    if (chunk === null) return null;
    read += chunk;
  }
  return buf;
}

async function readPdu(conn: Deno.TcpConn | Deno.TlsConn): Promise<{ commandId: number; commandStatus: number } | null> {
  const header = await readExact(conn, 16);
  if (!header) return null;
  const v = new DataView(header.buffer);
  const totalLen = v.getUint32(0);
  const commandId = v.getUint32(4);
  const commandStatus = v.getUint32(8);
  if (totalLen > 16) await readExact(conn, totalLen - 16);
  return { commandId, commandStatus };
}

function formatPhone(to: string): string {
  const clean = to.replace(/[\s.\-()/]/g, '');
  if (clean.startsWith('+')) return clean;
  if (clean.startsWith('0')) return '+33' + clean.substring(1);
  return '+33' + clean;
}

async function sendSmppSms(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  const systemId = Deno.env.get('OVH_SMPP_SYSTEM_ID');
  const password  = Deno.env.get('OVH_SMPP_PASSWORD');
  const host      = Deno.env.get('OVH_SMPP_HOST') || 'gra.smpp.ovh';
  const port      = parseInt(Deno.env.get('OVH_SMPP_PORT') || '2775');
  const sender    = Deno.env.get('OVH_SMS_SENDER') || 'Lotier';
  const useTls    = port === 2776;

  if (!systemId || !password) {
    return { success: false, error: 'Secrets manquants: OVH_SMPP_SYSTEM_ID et OVH_SMPP_PASSWORD requis dans les secrets Supabase' };
  }

  const phone = formatPhone(to);
  let conn: Deno.TcpConn | Deno.TlsConn;

  try {
    conn = useTls
      ? await Deno.connectTls({ hostname: host, port })
      : await Deno.connect({ hostname: host, port });
  } catch (e) {
    return { success: false, error: `Connexion SMPP impossible (${host}:${port}): ${(e as Error).message}` };
  }

  try {
    // 1. Bind transmitter
    await conn.write(buildBindTransmitter(systemId, password));
    const bindResp = await readPdu(conn);
    if (!bindResp) return { success: false, error: 'Aucune réponse du serveur SMPP' };
    if (bindResp.commandId !== CMD_BIND_TRANSMITTER_RESP) {
      return { success: false, error: `PDU inattendu: 0x${bindResp.commandId.toString(16)}` };
    }
    if (bindResp.commandStatus !== 0) {
      const msg = SMPP_ERRORS[bindResp.commandStatus] ?? `Erreur BIND: 0x${bindResp.commandStatus.toString(16).toUpperCase()}`;
      return { success: false, error: msg };
    }

    // 2. Submit SM
    await conn.write(buildSubmitSm(sender, phone, message, 2));
    const submitResp = await readPdu(conn);
    if (!submitResp) return { success: false, error: 'Aucune réponse SUBMIT_SM' };
    if (submitResp.commandId !== CMD_SUBMIT_SM_RESP) {
      return { success: false, error: `PDU inattendu: 0x${submitResp.commandId.toString(16)}` };
    }
    if (submitResp.commandStatus !== 0) {
      const msg = SMPP_ERRORS[submitResp.commandStatus] ?? `Erreur SUBMIT_SM: 0x${submitResp.commandStatus.toString(16).toUpperCase()}`;
      return { success: false, error: msg };
    }

    // 3. Unbind gracefully
    await conn.write(buildPdu(CMD_UNBIND, 3, new Uint8Array(0)));
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  } finally {
    try { conn.close(); } catch { /* ignore */ }
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

    const result = await sendSmppSms(to, message);

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
