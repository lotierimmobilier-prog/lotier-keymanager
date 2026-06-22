import { supabase } from '../lib/supabase';

export interface CheckoutEmailParams {
  agencyId: string;
  agencyName: string;
  agencyAddress?: string;
  agencyPhone?: string;
  agencyLogoUrl?: string;
  agencyPrimaryColor?: string;
  agencySecondaryColor?: string;
  contactEmail: string;
  contactName: string;
  keyLabels: string[];
  propertyReference: string;
  propertyAddress: string;
  outAt: string;
  expectedReturnAt: string;
  movementId?: string;
}

// Upload a local public asset to Supabase Storage once; return the CDN URL.
async function getStorageImageUrl(filename: string, localPath: string): Promise<string | null> {
  try {
    const { data: list } = await supabase.storage.from('email-assets').list('', { search: filename });
    if (list && list.some(f => f.name === filename)) {
      return supabase.storage.from('email-assets').getPublicUrl(filename).data.publicUrl;
    }
    const res = await fetch(localPath);
    if (!res.ok) return null;
    const blob = await res.blob();
    const { error } = await supabase.storage.from('email-assets').upload(filename, blob, { upsert: true, contentType: blob.type });
    if (error) return null;
    return supabase.storage.from('email-assets').getPublicUrl(filename).data.publicUrl;
  } catch {
    return null;
  }
}

// Lighten a hex color by mixing it with white
function lightenHex(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * amount));
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * amount));
  const b = Math.min(255, Math.round((n & 0xff) + (255 - (n & 0xff)) * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export async function sendKeyCheckoutEmail(params: CheckoutEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) return { success: false, error: 'Non authentifié' };

    const appUrl = window.location.origin;
    const primary   = params.agencyPrimaryColor   || '#1a1a2e';
    const secondary = params.agencySecondaryColor || primary;
    const primaryLight = lightenHex(primary, 0.88);
    const primaryMid   = lightenHex(primary, 0.60);

    // Resolve agency logo: prefer their stored URL, else try fallback assets
    let logoSrc: string | null = null;
    if (params.agencyLogoUrl) {
      logoSrc = params.agencyLogoUrl;
    } else {
      logoSrc = await getStorageImageUrl('logo_rond.jpg', `${appUrl}/images/logo_rond.jpg`);
    }

    const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const fmtShort = (iso: string) => new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const outDate  = fmt(params.outAt);
    const retDate  = fmt(params.expectedReturnAt);
    const retShort = fmtShort(params.expectedReturnAt);

    const logoBlock = logoSrc
      ? `<img src="${logoSrc}" alt="${params.agencyName}" width="80" height="80"
              style="width:80px;height:80px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 14px;border:3px solid ${primary};" />`
      : `<div style="width:80px;height:80px;border-radius:50%;background:${primary};margin:0 auto 14px;display:flex;align-items:center;justify-content:center;">
           <span style="color:#fff;font-size:28px;font-weight:900;line-height:80px;display:block;text-align:center;">${params.agencyName.charAt(0).toUpperCase()}</span>
         </div>`;

    const keyRows = params.keyLabels.map((label, i) => `
      <tr style="${i > 0 ? 'border-top:1px solid #f3f4f6;' : ''}">
        <td style="padding:10px 20px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="width:8px;height:8px;background:${primary};border-radius:50%;vertical-align:middle;"></td>
            <td style="padding-left:12px;color:#374151;font-size:14px;font-weight:500;vertical-align:middle;">${label}</td>
          </tr></table>
        </td>
      </tr>`).join('');

    const delayBtn = params.movementId ? `
      <!-- ═══════════ DELAY CTA ═══════════ -->
      <tr>
        <td style="padding:4px 32px 40px;">

          <p style="margin:0 0 12px;text-align:center;color:#9ca3af;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;">
            Impossible de restituer les clés à temps ?
          </p>

          <a href="${appUrl}/delay-request?id=${params.movementId}" target="_blank"
             style="display:block;text-decoration:none;border-radius:16px;overflow:hidden;">

            <!-- Urgency top bar -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#dc2626;padding:8px 24px;text-align:center;">
                  <span style="color:#fff;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.18em;">
                    &#9888; Pénalité minimum 50 € en cas de retard non signalé
                  </span>
                </td>
              </tr>
            </table>

            <!-- Main CTA body -->
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:${primary};">
              <tr>
                <td style="padding:22px 28px;">
                  <table width="100%" cellpadding="0" cellspacing="0"><tr>

                    <!-- Left: Icon -->
                    <td style="width:52px;vertical-align:middle;">
                      <div style="width:52px;height:52px;background:rgba(255,255,255,0.15);border-radius:14px;text-align:center;line-height:52px;font-size:26px;">
                        &#9200;
                      </div>
                    </td>

                    <!-- Center: Text -->
                    <td style="padding:0 16px;vertical-align:middle;">
                      <p style="margin:0 0 3px;color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-0.01em;line-height:1.2;">
                        Demander un délai
                      </p>
                      <p style="margin:0;color:rgba(255,255,255,0.72);font-size:12px;line-height:1.4;">
                        Signalez votre situation avant l'échéance du ${retShort}
                      </p>
                    </td>

                    <!-- Right: Arrow pill -->
                    <td style="width:36px;text-align:center;vertical-align:middle;">
                      <div style="width:36px;height:36px;background:rgba(255,255,255,0.18);border-radius:50%;text-align:center;line-height:36px;font-size:18px;color:#fff;font-weight:300;">
                        &#8250;
                      </div>
                    </td>

                  </tr></table>
                </td>
              </tr>
            </table>

            <!-- Bottom note -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:rgba(0,0,0,0.35);padding:7px 24px;text-align:center;">
                  <span style="color:rgba(255,255,255,0.6);font-size:10px;">
                    Lien personnel — valable uniquement pour ce dossier
                  </span>
                </td>
              </tr>
            </table>

          </a>
        </td>
      </tr>` : '';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Confirmation de remise de clés</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px 48px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <!-- ── HEADER ── -->
  <tr>
    <td style="background:#ffffff;border-radius:20px 20px 0 0;padding:36px 40px 28px;text-align:center;border-top:4px solid ${primary};">

      ${logoBlock}

      <h2 style="margin:0 0 4px;color:#111827;font-size:18px;font-weight:800;letter-spacing:-0.01em;">
        ${params.agencyName}
      </h2>
      ${params.agencyAddress ? `<p style="margin:0;color:#9ca3af;font-size:12px;">${params.agencyAddress}</p>` : ''}

    </td>
  </tr>

  <!-- ── DIVIDER ── -->
  <tr>
    <td style="background:#ffffff;padding:0 40px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="height:1px;background:#f3f4f6;font-size:0;">&nbsp;</td>
      </tr></table>
    </td>
  </tr>

  <!-- ── TITLE ── -->
  <tr>
    <td style="background:#ffffff;padding:28px 40px 8px;text-align:center;">
      <div style="display:inline-block;background:${primaryLight};border-radius:20px;padding:5px 14px;margin-bottom:14px;">
        <span style="color:${primary};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;">Remise de clés</span>
      </div>
      <h1 style="margin:0;color:#111827;font-size:24px;font-weight:300;line-height:1.3;letter-spacing:-0.01em;">
        Votre confirmation de <strong style="font-weight:800;">sortie de clés</strong>
      </h1>
    </td>
  </tr>

  <!-- ── GREETING ── -->
  <tr>
    <td style="background:#ffffff;padding:16px 40px 28px;text-align:center;">
      <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">
        Bonjour <strong style="color:#111827;">${params.contactName}</strong>,<br>
        les clés ci-dessous vous ont été remises. Conservez cet email<br>
        comme <strong style="color:#111827;">justificatif officiel</strong>.
      </p>
    </td>
  </tr>

  <!-- ── KEYS CARD ── -->
  <tr>
    <td style="background:#ffffff;padding:0 32px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr>
          <td style="background:${primaryLight};padding:10px 20px;border-bottom:1.5px solid ${primaryMid};">
            <span style="color:${primary};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">
              Clés remises
            </span>
          </td>
        </tr>
        ${keyRows}
      </table>
    </td>
  </tr>

  <!-- ── PROPERTY CARD ── -->
  <tr>
    <td style="background:#ffffff;padding:0 32px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr>
          <td style="background:${primaryLight};padding:10px 20px;border-bottom:1.5px solid ${primaryMid};">
            <span style="color:${primary};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">
              Bien concerné
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 20px 6px;">
            <span style="color:#9ca3af;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:3px;">Référence</span>
            <span style="color:#111827;font-size:15px;font-weight:700;">${params.propertyReference}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 20px 14px;">
            <span style="color:#9ca3af;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:3px;">Adresse</span>
            <span style="color:#374151;font-size:14px;">${params.propertyAddress}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ── DATE TIMELINE ── -->
  <tr>
    <td style="background:#ffffff;padding:0 32px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <!-- Out -->
          <td width="46%" style="vertical-align:top;">
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;">
              <span style="color:#9ca3af;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:5px;">Remis le</span>
              <span style="color:#111827;font-size:13px;font-weight:600;">${outDate}</span>
            </div>
          </td>
          <!-- Arrow -->
          <td width="8%" style="text-align:center;vertical-align:middle;padding:0 4px;">
            <span style="color:#d1d5db;font-size:20px;">&#8594;</span>
          </td>
          <!-- Return -->
          <td width="46%" style="vertical-align:top;">
            <div style="background:${primary};border-radius:10px;padding:14px 16px;">
              <span style="color:rgba(255,255,255,0.65);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:5px;">À rendre avant le</span>
              <span style="color:#ffffff;font-size:13px;font-weight:700;">${retDate}</span>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ── PENALTY NOTICE ── -->
  <tr>
    <td style="background:#ffffff;padding:0 32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="border-radius:10px;overflow:hidden;border:1px solid #fee2e2;">
        <tr>
          <td style="background:#fef2f2;padding:13px 18px;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="vertical-align:top;padding-right:10px;font-size:14px;line-height:1;">&#9888;</td>
              <td>
                <p style="margin:0;color:#7f1d1d;font-size:12px;line-height:1.7;">
                  La restitution est <strong>obligatoire avant le ${retShort}</strong>.
                  Tout retard non signalé entraîne un <strong>forfait minimum de 50 €</strong>.
                </p>
              </td>
            </tr></table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  ${delayBtn}

  <!-- ── FOOTER ── -->
  <tr>
    <td style="background:#ffffff;border-top:1px solid #f3f4f6;padding:20px 40px;text-align:center;border-radius:0 0 20px 20px;">
      <p style="margin:0 0 4px;color:#111827;font-size:13px;font-weight:600;">${params.agencyName}</p>
      ${params.agencyAddress ? `<p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">${params.agencyAddress}</p>` : ''}
      ${params.agencyPhone ? `<p style="margin:0 0 12px;color:#9ca3af;font-size:12px;">${params.agencyPhone}</p>` : `<p style="margin:0 0 12px;"></p>`}
      <p style="margin:0;color:#d1d5db;font-size:10px;letter-spacing:0.04em;">
        Email automatique — Ne pas répondre &nbsp;·&nbsp;
        <a href="https://keymanager.io" style="color:#9ca3af;text-decoration:none;">KeyManager.io</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agencyId: params.agencyId,
          to: params.contactEmail,
          toName: params.contactName,
          subject: `Remise de clés — ${params.propertyReference} — retour le ${retShort}`,
          html,
        }),
      }
    );

    const result = await response.json();
    return result;
  } catch (err) {
    console.error('sendKeyCheckoutEmail error:', err);
    return { success: false, error: String(err) };
  }
}
