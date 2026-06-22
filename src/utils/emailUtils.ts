import { supabase } from '../lib/supabase';

export interface CheckoutEmailParams {
  agencyId: string;
  agencyName: string;
  agencyAddress?: string;
  agencyPhone?: string;
  agencyEmail?: string;
  agencyWebsite?: string;
  agencyLogoUrl?: string;
  agencyPrimaryColor?: string;
  agencySecondaryColor?: string;
  contactEmail: string;
  contactName: string;
  keyLabels: string[];
  propertyReference: string;
  propertyAddress: string;
  propertyPhotoUrl?: string;
  outAt: string;
  expectedReturnAt: string;
  movementId?: string;
}

async function getStorageImageUrl(filename: string, localPath: string): Promise<string | null> {
  try {
    const { data: list } = await supabase.storage.from('email-assets').list('', { search: filename });
    if (list && list.some(f => f.name === filename)) {
      return supabase.storage.from('email-assets').getPublicUrl(filename).data.publicUrl;
    }
    const res = await fetch(localPath);
    if (!res.ok) return null;
    const blob = await res.blob();
    await supabase.storage.from('email-assets').upload(filename, blob, { upsert: true, contentType: blob.type });
    return supabase.storage.from('email-assets').getPublicUrl(filename).data.publicUrl;
  } catch {
    return null;
  }
}

function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * amount));
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * amount));
  const b = Math.min(255, Math.round((n & 0xff) + (255 - (n & 0xff)) * amount));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export async function sendKeyCheckoutEmail(params: CheckoutEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) return { success: false, error: 'Non authentifié' };

    const appUrl = window.location.origin;
    const primary = params.agencyPrimaryColor || '#111827';
    const primaryLight = lighten(primary, 0.90);
    const primaryMid   = lighten(primary, 0.65);

    const delayUrl = params.movementId
      ? `${appUrl}/delay-request?id=${params.movementId}`
      : null;

    const qrUrl = delayUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=140x140&color=111827&bgcolor=FFFFFF&data=${encodeURIComponent(delayUrl)}`
      : null;

    // Logo: agency logo or fallback to LOTIER logo in storage
    let logoSrc: string | null = params.agencyLogoUrl || null;
    if (!logoSrc) {
      logoSrc = await getStorageImageUrl('logo_rond.jpg', `${appUrl}/images/logo_rond.jpg`);
    }

    const logoBlock = logoSrc
      ? `<img src="${logoSrc}" alt="${params.agencyName}" width="64" height="64"
              style="width:64px;height:64px;border-radius:50%;object-fit:cover;display:block;" />`
      : `<div style="width:64px;height:64px;border-radius:50%;background:${primary};text-align:center;line-height:64px;font-size:26px;font-weight:900;color:#ffffff;display:inline-block;">${params.agencyName.charAt(0).toUpperCase()}</div>`;

    const keyCount = params.keyLabels.length;
    const keyList  = params.keyLabels.join(', ');
    const keyRows  = params.keyLabels.map(label => `
      <tr>
        <td style="padding:0 0 8px 0;">
          <table cellpadding="0" cellspacing="0" width="100%"><tr>
            <td style="width:28px;height:28px;background:${primaryLight};border-radius:8px;text-align:center;vertical-align:middle;font-size:14px;">&#128273;</td>
            <td style="padding-left:10px;color:#111827;font-size:14px;font-weight:500;vertical-align:middle;">${label}</td>
          </tr></table>
        </td>
      </tr>`).join('');

    const photoBlock = params.propertyPhotoUrl ? `
      <tr>
        <td style="padding:0 0 12px 0;">
          <img src="${params.propertyPhotoUrl}" alt="Photo du bien"
               style="width:100%;max-width:560px;height:200px;object-fit:cover;border-radius:12px;display:block;" />
        </td>
      </tr>` : '';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Remise de clés confirmée</title>
</head>
<body style="margin:0;padding:0;background:#F7F7F7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F7;padding:32px 16px 48px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <!-- ═══════════════════════════════════════════════
       HEADER — agency branding
  ════════════════════════════════════════════════ -->
  <tr>
    <td style="background:#ffffff;border-radius:16px 16px 0 0;padding:28px 32px 24px;border-bottom:1px solid #F0F0F0;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle;">${logoBlock}</td>
        <td style="padding-left:14px;vertical-align:middle;">
          <p style="margin:0;color:#111827;font-size:15px;font-weight:700;line-height:1.3;">${params.agencyName}</p>
          ${params.agencyAddress ? `<p style="margin:2px 0 0;color:#9CA3AF;font-size:12px;">${params.agencyAddress}</p>` : ''}
        </td>
      </tr></table>
    </td>
  </tr>

  <!-- ═══════════════════════════════════════════════
       HERO — success status
  ════════════════════════════════════════════════ -->
  <tr>
    <td style="background:#ffffff;padding:32px 32px 8px;text-align:center;">
      <!-- Check circle -->
      <div style="width:56px;height:56px;border-radius:50%;background:#ECFDF5;margin:0 auto 16px;text-align:center;line-height:56px;font-size:26px;">&#10003;</div>
      <h1 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;">
        Clés remises avec succès
      </h1>
      <p style="margin:0;color:#6B7280;font-size:15px;line-height:1.6;">
        Vos clés ont bien été enregistrées dans notre système.
      </p>
    </td>
  </tr>

  <!-- ═══════════════════════════════════════════════
       GREETING
  ════════════════════════════════════════════════ -->
  <tr>
    <td style="background:#ffffff;padding:20px 32px 28px;">
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.8;">
        Bonjour <strong style="color:#111827;">${params.contactName}</strong>,<br>
        Les clés ci-dessous viennent d'être enregistrées.<br>
        Conservez cet email : il constitue votre <strong>justificatif officiel de remise de clés</strong>.
      </p>
    </td>
  </tr>

  <!-- ═══════════════════════════════════════════════
       SUMMARY CARD — quick read in 5 seconds
  ════════════════════════════════════════════════ -->
  <tr>
    <td style="background:#ffffff;padding:0 24px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:${primaryLight};border:1.5px solid ${primaryMid};border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:16px 20px 12px;border-bottom:1px solid ${primaryMid};">
            <span style="color:${primary};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">
              &#9989;&nbsp; Résumé de la remise
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom:10px;vertical-align:top;width:50%;">
                  <span style="color:#9CA3AF;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:3px;">Clés remises</span>
                  <span style="color:#111827;font-size:14px;font-weight:600;">${keyCount} clé${keyCount > 1 ? 's' : ''}</span>
                </td>
                <td style="padding-bottom:10px;vertical-align:top;width:50%;">
                  <span style="color:#9CA3AF;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:3px;">Référence bien</span>
                  <span style="color:#111827;font-size:14px;font-weight:600;">${params.propertyReference}</span>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding-bottom:6px;">
                  <span style="color:#9CA3AF;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:3px;">Adresse</span>
                  <span style="color:#374151;font-size:13px;">${params.propertyAddress}</span>
                </td>
              </tr>
              <tr>
                <td colspan="2">
                  <span style="color:#9CA3AF;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:3px;">Retour prévu</span>
                  <span style="color:${primary};font-size:14px;font-weight:700;">${fmtShort(params.expectedReturnAt)}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Property photo (optional) -->
  ${photoBlock ? `<tr><td style="background:#ffffff;padding:0 24px 24px;">${photoBlock}</td></tr>` : ''}

  <!-- ═══════════════════════════════════════════════
       BIEN CONCERNÉ — detail card
  ════════════════════════════════════════════════ -->
  <tr>
    <td style="background:#ffffff;padding:0 24px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
        <!-- Card header -->
        <tr>
          <td style="padding:12px 20px;border-bottom:1px solid #F3F4F6;background:#FAFAFA;">
            <span style="color:#111827;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Bien concerné</span>
          </td>
        </tr>
        <!-- Address row -->
        <tr>
          <td style="padding:14px 20px 10px;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:16px;vertical-align:top;padding-right:8px;line-height:1.2;">&#128205;</td>
              <td>
                <span style="color:#9CA3AF;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:2px;">Adresse</span>
                <span style="color:#111827;font-size:14px;font-weight:500;">${params.propertyAddress}</span>
              </td>
            </tr></table>
          </td>
        </tr>
        <!-- Reference row -->
        <tr>
          <td style="padding:0 20px 14px;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:16px;vertical-align:top;padding-right:8px;line-height:1.2;">&#127968;</td>
              <td>
                <span style="color:#9CA3AF;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:2px;">Référence</span>
                <span style="color:#111827;font-size:15px;font-weight:700;">${params.propertyReference}</span>
              </td>
            </tr></table>
          </td>
        </tr>
        <!-- Keys rows -->
        <tr>
          <td style="padding:0 20px 14px;border-top:1px solid #F3F4F6;padding-top:14px;">
            <table cellpadding="0" cellspacing="0" width="100%"><tr>
              <td style="font-size:16px;vertical-align:top;padding-right:8px;line-height:1.6;">&#128273;</td>
              <td style="width:100%;">
                <span style="color:#9CA3AF;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:6px;">Clé${keyCount > 1 ? 's' : ''} remise${keyCount > 1 ? 's' : ''}</span>
                <table width="100%" cellpadding="0" cellspacing="0">${keyRows}</table>
              </td>
            </tr></table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ═══════════════════════════════════════════════
       DATE CARDS — side by side
  ════════════════════════════════════════════════ -->
  <tr>
    <td style="background:#ffffff;padding:0 24px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <!-- Remise -->
          <td width="48%" style="vertical-align:top;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
              <tr>
                <td style="background:#FAFAFA;padding:10px 16px;border-bottom:1px solid #F3F4F6;text-align:center;">
                  <span style="color:#6B7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">Remise</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 16px;text-align:center;">
                  <p style="margin:0 0 2px;color:#111827;font-size:16px;font-weight:700;">${fmtDate(params.outAt)}</p>
                  <p style="margin:0;color:#6B7280;font-size:22px;font-weight:300;">${fmtTime(params.outAt)}</p>
                </td>
              </tr>
            </table>
          </td>
          <!-- Arrow -->
          <td width="4%" style="text-align:center;vertical-align:middle;padding:0 4px;">
            <span style="color:#D1D5DB;font-size:18px;">&#8594;</span>
          </td>
          <!-- Retour prévu -->
          <td width="48%" style="vertical-align:top;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="border:2px solid ${primary};border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:${primary};padding:10px 16px;text-align:center;">
                  <span style="color:rgba(255,255,255,0.85);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">Retour prévu</span>
                </td>
              </tr>
              <tr>
                <td style="background:#ffffff;padding:14px 16px;text-align:center;">
                  <p style="margin:0 0 2px;color:#111827;font-size:16px;font-weight:700;">${fmtDate(params.expectedReturnAt)}</p>
                  <p style="margin:0;color:${primary};font-size:22px;font-weight:700;">${fmtTime(params.expectedReturnAt)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ═══════════════════════════════════════════════
       WARNING — soft, non-aggressive
  ════════════════════════════════════════════════ -->
  <tr>
    <td style="background:#ffffff;padding:0 24px 28px;">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;">
        <tr>
          <td style="padding:14px 18px;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:18px;vertical-align:top;padding-right:12px;padding-top:1px;line-height:1;">&#9888;&#65039;</td>
              <td>
                <p style="margin:0 0 4px;color:#92400E;font-size:13px;font-weight:700;">Rappel de restitution</p>
                <p style="margin:0;color:#78350F;font-size:13px;line-height:1.7;">
                  Les clés devront être restituées avant le <strong>${fmtShort(params.expectedReturnAt)}</strong>.<br>
                  En cas de retard non signalé, des frais pourront être appliqués conformément à nos conditions.
                </p>
              </td>
            </tr></table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ═══════════════════════════════════════════════
       ACTION BUTTONS
  ════════════════════════════════════════════════ -->
  ${delayUrl ? `
  <tr>
    <td style="background:#ffffff;padding:0 24px 32px;">

      <!-- Primary: Demander un délai -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
        <tr>
          <td style="border-radius:12px;overflow:hidden;text-align:center;background:#111827;">
            <a href="${delayUrl}" target="_blank"
               style="display:block;padding:16px 24px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:-0.01em;">
              &#9200;&nbsp; Demander un délai
            </a>
          </td>
        </tr>
      </table>

      <!-- Secondary: Voir mon dossier -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="border-radius:12px;overflow:hidden;text-align:center;border:1.5px solid #E5E7EB;">
            <a href="${delayUrl}" target="_blank"
               style="display:block;padding:14px 24px;color:#374151;text-decoration:none;font-size:14px;font-weight:600;">
              &#128196;&nbsp; Voir mon dossier
            </a>
          </td>
        </tr>
      </table>

    </td>
  </tr>` : ''}

  <!-- ═══════════════════════════════════════════════
       QR CODE
  ════════════════════════════════════════════════ -->
  ${qrUrl ? `
  <tr>
    <td style="background:#ffffff;padding:0 24px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="border:1px solid #E5E7EB;border-radius:14px;">
        <tr>
          <td style="padding:20px;text-align:center;">
            <p style="margin:0 0 12px;color:#9CA3AF;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">
              Scannez pour accéder à votre dossier
            </p>
            <img src="${qrUrl}" alt="QR Code dossier" width="140" height="140"
                 style="display:block;margin:0 auto;border-radius:8px;" />
          </td>
        </tr>
      </table>
    </td>
  </tr>` : ''}

  <!-- ═══════════════════════════════════════════════
       FOOTER — agency contact
  ════════════════════════════════════════════════ -->
  <tr>
    <td style="background:#ffffff;border-top:1px solid #F3F4F6;padding:24px 32px;border-radius:0 0 16px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="margin:0 0 6px;color:#111827;font-size:14px;font-weight:700;">${params.agencyName}</p>
            ${params.agencyPhone ? `<p style="margin:0 0 3px;color:#6B7280;font-size:13px;">&#128222;&nbsp; ${params.agencyPhone}</p>` : ''}
            ${params.agencyEmail ? `<p style="margin:0 0 3px;color:#6B7280;font-size:13px;">&#9993;&nbsp; <a href="mailto:${params.agencyEmail}" style="color:#6B7280;text-decoration:none;">${params.agencyEmail}</a></p>` : ''}
            ${params.agencyWebsite ? `<p style="margin:0 0 3px;color:#6B7280;font-size:13px;">&#127758;&nbsp; <a href="${params.agencyWebsite}" style="color:#6B7280;text-decoration:none;">${params.agencyWebsite.replace(/^https?:\/\//, '')}</a></p>` : ''}
            ${params.agencyAddress ? `<p style="margin:0;color:#6B7280;font-size:13px;">&#128205;&nbsp; ${params.agencyAddress}</p>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding-top:16px;border-top:1px solid #F3F4F6;margin-top:16px;">
            <p style="margin:8px 0 0;color:#D1D5DB;font-size:10px;letter-spacing:0.04em;">
              Email automatique — ne pas répondre &nbsp;·&nbsp;
              <a href="https://keymanager.io" style="color:#D1D5DB;text-decoration:none;">KeyManager.io</a>
            </p>
          </td>
        </tr>
      </table>
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
          subject: `Clés remises — ${params.propertyReference} — retour le ${fmtShort(params.expectedReturnAt)}`,
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
