import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function fmtShort(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * amount));
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * amount));
  const b = Math.min(255, Math.round((n & 0xff) + (255 - (n & 0xff)) * amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

async function sendEmail(supabaseUrl: string, serviceKey: string, agencyId: string, to: string, toName: string, subject: string, html: string) {
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ agencyId, to, toName, subject, html }),
    });
  } catch (err) {
    console.error("sendEmail error:", err);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const appUrl = Deno.env.get("APP_URL") || "https://keymanager.io";

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const url = new URL(req.url);

    // ─── GET: load movement details OR handle approve/reject ──────────────────
    if (req.method === "GET") {
      const movementId = url.searchParams.get("id");
      const action = url.searchParams.get("action");

      if (!movementId) {
        return new Response(
          JSON.stringify({ success: false, error: "id requis" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // One-click approve / reject
      if (action === "approve" || action === "reject") {
        const { data: movement, error: fetchErr } = await supabase
          .from("key_movements")
          .select(`
            id, given_to_name, expected_return_at, returned_at, contact_email,
            delay_request_status, delay_requested_new_date,
            keys!inner ( label, properties ( reference, address ) ),
            agency:agency_id ( id, name, logo_url, primary_color )
          `)
          .eq("id", movementId)
          .single();

        if (fetchErr || !movement) {
          return new Response(
            JSON.stringify({ success: false, error: "Mouvement introuvable" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (movement.delay_request_status !== "pending") {
          return new Response(
            JSON.stringify({ success: false, error: "Cette demande a déjà été traitée", already: true, approved: movement.delay_request_status === "approved" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const approved = action === "approve";
        const updates: Record<string, unknown> = {
          delay_request_status: approved ? "approved" : "rejected",
          delay_responded_at: new Date().toISOString(),
        };
        if (approved && movement.delay_requested_new_date) {
          updates.expected_return_at = movement.delay_requested_new_date;
        }

        await supabase.from("key_movements").update(updates).eq("id", movementId);

        // Send confirmation email to contractor
        const ag = movement.agency as any;
        const key = (movement as any).keys;
        const prop = key?.properties;

        if (movement.contact_email && ag?.id) {
          const primary = ag?.primary_color || "#111827";

          const newDateBlock = approved && movement.delay_requested_new_date ? `
            <tr><td style="padding:0 24px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${primary};border-radius:12px;overflow:hidden;">
                <tr><td style="background:${primary};padding:10px 16px;text-align:center;">
                  <span style="color:rgba(255,255,255,0.85);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">Nouvelle date de retour</span>
                </td></tr>
                <tr><td style="background:#fff;padding:16px;text-align:center;">
                  <p style="margin:0;color:#111827;font-size:17px;font-weight:800;">${fmtShort(movement.delay_requested_new_date)}</p>
                </td></tr>
              </table>
            </td></tr>` : "";

          const rejectedBlock = !approved ? `
            <tr><td style="padding:0 24px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #EF4444;border-radius:12px;">
                <tr><td style="background:#EF4444;padding:10px 16px;text-align:center;">
                  <span style="color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">Date de retour obligatoire</span>
                </td></tr>
                <tr><td style="background:#fff;padding:16px;text-align:center;">
                  <p style="margin:0;color:#111827;font-size:17px;font-weight:800;">${fmtShort(movement.expected_return_at)}</p>
                </td></tr>
              </table>
            </td></tr>` : "";

          const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>Réponse à votre demande de délai</title></head>
<body style="margin:0;padding:0;background:#F7F7F7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F7;padding:32px 16px 48px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
  <tr><td style="background:#fff;border-radius:16px 16px 0 0;padding:24px 28px 20px;border-top:4px solid ${primary};border-bottom:1px solid #F3F4F6;">
    <p style="margin:0;font-size:15px;font-weight:700;color:#111827;">${ag?.name || "Votre agence"}</p>
  </td></tr>
  <tr><td style="background:#fff;padding:24px 28px 12px;text-align:center;">
    <div style="display:inline-block;background:${approved ? "#ECFDF5" : "#FEF2F2"};border:2px solid ${approved ? "#6EE7B7" : "#FCA5A5"};border-radius:50px;padding:10px 24px;">
      <span style="color:${approved ? "#065F46" : "#991B1B"};font-size:15px;font-weight:700;">${approved ? "Demande acceptée ✓" : "Demande refusée"}</span>
    </div>
    <p style="margin:16px 0 0;color:#374151;font-size:14px;">
      Bonjour <strong>${movement.given_to_name}</strong>, votre demande de délai pour
      <strong>${prop?.reference || ""}</strong> — ${prop?.address || ""} a été ${approved ? "acceptée" : "refusée"}.
    </p>
  </td></tr>
  ${newDateBlock}
  ${rejectedBlock}
  <tr><td style="background:#fff;border-radius:0 0 16px 16px;padding:16px 28px 24px;border-top:1px solid #F3F4F6;">
    <p style="margin:0;color:#9CA3AF;font-size:11px;">Notification automatique — <a href="https://keymanager.io" style="color:#9CA3AF;text-decoration:none;">KeyManager.io</a></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

          await sendEmail(supabaseUrl, serviceKey, ag.id, movement.contact_email, movement.given_to_name,
            `${approved ? "Délai accordé" : "Délai refusé"} — ${prop?.reference || ""}`,
            html
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            approved,
            movement: {
              given_to_name: movement.given_to_name,
              property: prop,
              new_date: approved ? movement.delay_requested_new_date : null,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Normal GET: load movement for delay request form
      const { data: movement, error } = await supabase
        .from("key_movements")
        .select(`
          id, given_to_name, out_at, expected_return_at, returned_at,
          delay_requested_at, delay_request_status,
          keys!inner ( label, properties ( reference, address ) ),
          agency:agency_id ( name, logo_url, primary_color, address, email_smtp_host )
        `)
        .eq("id", movementId)
        .single();

      if (error || !movement) {
        return new Response(
          JSON.stringify({ success: false, error: "Mouvement introuvable" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, movement }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── POST: submit delay request ───────────────────────────────────────────
    if (req.method === "POST") {
      const { movementId, message, newReturnDate } = await req.json();

      if (!movementId) {
        return new Response(
          JSON.stringify({ success: false, error: "movementId requis" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: movement, error: fetchError } = await supabase
        .from("key_movements")
        .select(`
          id, given_to_name, returned_at, delay_request_status, expected_return_at,
          keys!inner ( label, properties ( reference, address ) ),
          agency:agency_id ( id, name, logo_url, primary_color, notification_email )
        `)
        .eq("id", movementId)
        .single();

      if (fetchError || !movement) {
        return new Response(
          JSON.stringify({ success: false, error: "Mouvement introuvable" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (movement.returned_at) {
        return new Response(
          JSON.stringify({ success: false, error: "Cette clé a déjà été rendue" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (movement.delay_request_status === "pending") {
        return new Response(
          JSON.stringify({ success: false, error: "Une demande est déjà en attente" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabase
        .from("key_movements")
        .update({
          delay_requested_at: new Date().toISOString(),
          delay_request_message: message || null,
          delay_requested_new_date: newReturnDate || null,
          delay_request_status: "pending",
          delay_response_message: null,
          delay_responded_at: null,
          delay_responded_by: null,
        })
        .eq("id", movementId);

      if (updateError) throw updateError;

      // Notify agency by email if notification_email is configured
      const ag = movement.agency as any;
      const key = (movement as any).keys;
      const prop = key?.properties;

      if (ag?.notification_email && ag?.id) {
        const primary = ag.primary_color || "#111827";

        const approveUrl = `${appUrl}/delay-approve?id=${movementId}&action=approve`;
        const rejectUrl = `${appUrl}/delay-approve?id=${movementId}&action=reject`;

        const newDateRow = newReturnDate ? `
          <tr><td style="padding-bottom:12px;vertical-align:top;">
            <span style="color:#9CA3AF;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:3px;">Nouvelle date demandée</span>
            <span style="color:#111827;font-size:14px;font-weight:700;">${fmtShort(newReturnDate)}</span>
          </td></tr>` : "";

        const messageRow = message ? `
          <tr><td style="padding-bottom:12px;vertical-align:top;">
            <span style="color:#9CA3AF;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:3px;">Motif</span>
            <span style="color:#374151;font-size:13px;font-style:italic;">"${message}"</span>
          </td></tr>` : "";

        const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>Demande de délai</title></head>
<body style="margin:0;padding:0;background:#F7F7F7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F7;padding:32px 16px 48px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

  <tr><td style="background:#fff;border-radius:16px 16px 0 0;padding:24px 28px 20px;border-top:4px solid ${primary};border-bottom:1px solid #F3F4F6;">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="width:40px;height:40px;background:#FEF3C7;border-radius:10px;text-align:center;line-height:40px;font-size:20px;">&#9200;</td>
      <td style="padding-left:12px;vertical-align:middle;">
        <p style="margin:0;font-size:16px;font-weight:700;color:#111827;">Nouvelle demande de délai</p>
        <p style="margin:2px 0 0;font-size:12px;color:#9CA3AF;">${ag.name}</p>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="background:#FAFAFA;padding:20px 28px;border-bottom:1px solid #F3F4F6;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-bottom:12px;vertical-align:top;width:50%;">
          <span style="color:#9CA3AF;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:3px;">Prestataire</span>
          <span style="color:#111827;font-size:14px;font-weight:600;">${movement.given_to_name}</span>
        </td>
        <td style="padding-bottom:12px;vertical-align:top;width:50%;">
          <span style="color:#9CA3AF;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:3px;">Bien</span>
          <span style="color:#111827;font-size:14px;font-weight:600;">${prop?.reference || ""}</span>
        </td>
      </tr>
      <tr><td colspan="2" style="padding-bottom:12px;">
        <span style="color:#9CA3AF;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:3px;">Adresse</span>
        <span style="color:#374151;font-size:13px;">${prop?.address || ""}</span>
      </td></tr>
      <tr><td style="padding-bottom:12px;vertical-align:top;">
        <span style="color:#9CA3AF;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:3px;">Clé</span>
        <span style="color:#374151;font-size:13px;">${key?.label || ""}</span>
      </td></tr>
      <tr><td style="padding-bottom:12px;vertical-align:top;">
        <span style="color:#9CA3AF;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:3px;">Date de retour initiale</span>
        <span style="color:#111827;font-size:14px;font-weight:600;">${fmtShort(movement.expected_return_at)}</span>
      </td></tr>
      ${newDateRow}
      ${messageRow}
    </table>
  </td></tr>

  <tr><td style="background:#fff;padding:24px 28px 28px;">
    <p style="margin:0 0 16px;color:#374151;font-size:14px;font-weight:500;">Répondez en un clic :</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="48%" style="text-align:center;">
          <a href="${approveUrl}" style="display:block;background:#059669;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 20px;border-radius:12px;">&#10003;&nbsp; Accepter</a>
        </td>
        <td width="4%"></td>
        <td width="48%" style="text-align:center;">
          <a href="${rejectUrl}" style="display:block;background:#EF4444;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 20px;border-radius:12px;">&#10005;&nbsp; Refuser</a>
        </td>
      </tr>
    </table>
    <p style="margin:14px 0 0;color:#9CA3AF;font-size:11px;text-align:center;">
      Ou gérez-la depuis votre <a href="${appUrl}/dashboard/movements" style="color:#9CA3AF;">tableau de bord</a>
    </p>
  </td></tr>

  <tr><td style="padding-top:12px;text-align:center;">
    <p style="margin:0;color:#D1D5DB;font-size:10px;">Notification automatique — <a href="https://keymanager.io" style="color:#D1D5DB;text-decoration:none;">KeyManager.io</a></p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

        await sendEmail(supabaseUrl, serviceKey, ag.id, ag.notification_email, ag.name,
          `Demande de délai — ${prop?.reference || ""} — ${movement.given_to_name}`,
          html
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Méthode non supportée" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("delay-request error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
