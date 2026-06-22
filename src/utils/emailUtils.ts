import { supabase } from '../lib/supabase';

interface CheckoutEmailParams {
  agencyId: string;
  agencyName: string;
  logoUrl?: string;
  contactEmail: string;
  contactName: string;
  keyLabels: string[];
  propertyReference: string;
  propertyAddress: string;
  outAt: string;
  expectedReturnAt: string;
  movementId?: string;
}

const GOLD = '#B8924A';
const GOLD_LIGHT = '#D4AF72';
const DARK = '#111827';

// Upload an image to Supabase Storage (email-assets bucket) and return the public CDN URL.
// If already uploaded, returns the existing URL directly.
async function getStorageImageUrl(filename: string, localPath: string): Promise<string> {
  const { data: urlData } = supabase.storage.from('email-assets').getPublicUrl(filename);
  const publicUrl = urlData.publicUrl;

  // Check if the file already exists
  const { data: existing } = await supabase.storage.from('email-assets').list('', { search: filename });
  if (existing && existing.some(f => f.name === filename)) {
    return publicUrl;
  }

  // Upload from the app's public folder
  try {
    const res = await fetch(localPath);
    const blob = await res.blob();
    const { error } = await supabase.storage
      .from('email-assets')
      .upload(filename, blob, { upsert: true, contentType: blob.type });
    if (error) console.warn('Storage upload warning:', error.message);
  } catch (err) {
    console.warn('Storage upload failed, falling back to local URL:', err);
    return localPath;
  }

  return publicUrl;
}

export async function sendKeyCheckoutEmail(params: CheckoutEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) return { success: false, error: 'Non authentifié' };

    const appUrl = window.location.origin;

    // Get stable CDN URLs for images (uploads once, reuses forever)
    const [logoUrl, footerUrl] = await Promise.all([
      getStorageImageUrl('logo_rond.jpg', `${appUrl}/images/logo_rond.jpg`),
      getStorageImageUrl('header_copie.png', `${appUrl}/images/header_copie.png`),
    ]);

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

    const keyRows = params.keyLabels.map(label => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f0ead8;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="width:28px;height:28px;background:${GOLD};border-radius:50%;text-align:center;vertical-align:middle;font-size:13px;color:#fff;font-weight:700;">
              &#128273;
            </td>
            <td style="padding-left:12px;color:${DARK};font-size:14px;font-weight:500;vertical-align:middle;">${label}</td>
          </tr></table>
        </td>
      </tr>`).join('');

    const delayBtn = params.movementId ? `
      <tr>
        <td style="padding:8px 32px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
            <tr><td style="height:1px;background:#e8dcc8;font-size:0;">&nbsp;</td></tr>
          </table>
          <p style="margin:0 0 14px;text-align:center;color:#9a8060;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;">
            Vous ne pouvez pas rendre les clés à temps ?
          </p>
          <a href="${appUrl}/delay-request?id=${params.movementId}" target="_blank" style="display:block;text-decoration:none;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:14px;overflow:hidden;">
              <tr>
                <td style="background:${GOLD};padding:9px 20px;text-align:center;">
                  <span style="color:#fff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.14em;">
                    Cliquez ici avant l'échéance pour éviter la pénalité de 50&nbsp;€
                  </span>
                </td>
              </tr>
              <tr>
                <td style="background:#111827;padding:18px 22px;">
                  <table width="100%" cellpadding="0" cellspacing="0"><tr>
                    <td style="width:56px;vertical-align:middle;">
                      <table cellpadding="0" cellspacing="0"><tr>
                        <td style="width:56px;height:56px;background:rgba(184,146,74,0.12);border:2px solid ${GOLD};border-radius:12px;text-align:center;vertical-align:middle;font-size:26px;line-height:56px;">
                          &#9200;
                        </td>
                      </tr></table>
                    </td>
                    <td style="padding-left:16px;vertical-align:middle;">
                      <p style="margin:0 0 4px;color:#ffffff;font-size:17px;font-weight:800;line-height:1.2;">
                        Demander un délai supplémentaire
                      </p>
                      <p style="margin:0;color:${GOLD_LIGHT};font-size:12px;">
                        Votre demande est transmise immédiatement à l'agence
                      </p>
                    </td>
                    <td style="width:30px;text-align:right;vertical-align:middle;">
                      <span style="color:${GOLD};font-size:28px;font-weight:200;">&#8250;</span>
                    </td>
                  </tr></table>
                </td>
              </tr>
              <tr>
                <td style="background:#1a1a1a;padding:7px 20px;text-align:center;border-top:1px solid rgba(184,146,74,0.3);">
                  <span style="color:#6b7280;font-size:10px;">Ce lien est personnel et lié à votre dossier</span>
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
  <title>Remise de clés — LOTIER Immobilier</title>
</head>
<body style="margin:0;padding:0;background:#ede8df;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ede8df;padding:28px 0 40px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <tr><td style="background:${GOLD};height:5px;border-radius:16px 16px 0 0;font-size:0;">&nbsp;</td></tr>

  <tr>
    <td style="background:#ffffff;padding:36px 40px 24px;text-align:center;">
      <img src="${logoUrl}" alt="LOTIER Immobilier" width="110" height="110"
           style="width:110px;height:110px;border-radius:50%;display:block;margin:0 auto 16px;" />
      <p style="margin:0;color:#9a8060;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;">Gestion Locative</p>
    </td>
  </tr>

  <tr>
    <td style="background:#ffffff;padding:0 40px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="height:1px;background:#e8dcc8;font-size:0;">&nbsp;</td>
      </tr></table>
    </td>
  </tr>

  <tr>
    <td style="background:#ffffff;padding:28px 40px 24px;text-align:center;">
      <h1 style="margin:0;color:${DARK};font-size:26px;font-weight:300;letter-spacing:0.08em;text-transform:uppercase;line-height:1.2;">
        Confirmation de<br>
        <strong style="font-weight:800;color:${GOLD};">Remise de Clés</strong>
      </h1>
    </td>
  </tr>

  <tr>
    <td style="background:#ffffff;padding:4px 40px 24px;text-align:center;">
      <p style="margin:0;color:#374151;font-size:15px;line-height:1.7;">
        Bonjour <strong style="color:${DARK};">${params.contactName}</strong>,
      </p>
      <p style="margin:6px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">
        Veuillez trouver ci-dessous la confirmation de remise de clés.<br>
        Conservez cet email comme <strong style="color:${DARK};">justificatif officiel</strong>.
      </p>
    </td>
  </tr>

  <tr>
    <td style="background:#ffffff;padding:0 32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8dcc8;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#faf6ef;padding:11px 16px;border-bottom:2px solid ${GOLD};">
            <span style="color:${DARK};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;">&#128273;&nbsp; Clés remises</span>
          </td>
        </tr>
        ${keyRows}
      </table>
    </td>
  </tr>

  <tr>
    <td style="background:#ffffff;padding:0 32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #e8dcc8;">
        <tr>
          <td style="background:#faf6ef;padding:11px 16px;border-bottom:2px solid ${GOLD};">
            <span style="color:${DARK};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;">&#127968;&nbsp; Bien concerné</span>
          </td>
        </tr>
        <tr>
          <td style="padding:13px 16px;border-bottom:1px solid #f0ead8;">
            <span style="color:#9a8060;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:3px;">Référence</span>
            <span style="color:${DARK};font-size:15px;font-weight:700;">${params.propertyReference}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:13px 16px;">
            <span style="color:#9a8060;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:3px;">Adresse</span>
            <span style="color:#374151;font-size:14px;">${params.propertyAddress}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="background:#ffffff;padding:0 32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="44%" style="background:#f8f9fa;border:1px solid #e8dcc8;border-radius:10px;padding:14px 16px;vertical-align:top;">
            <span style="color:#9a8060;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:5px;">&#128197;&nbsp; Remis le</span>
            <span style="color:${DARK};font-size:13px;font-weight:600;">${outDate}</span>
          </td>
          <td width="12%" style="text-align:center;vertical-align:middle;">
            <span style="color:${GOLD};font-size:24px;font-weight:300;">&#8594;</span>
          </td>
          <td width="44%" style="background:${DARK};border:2px solid ${GOLD};border-radius:10px;padding:14px 16px;vertical-align:top;">
            <span style="color:${GOLD_LIGHT};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:5px;">&#9201;&nbsp; À rendre avant le</span>
            <span style="color:#ffffff;font-size:13px;font-weight:700;">${retDate}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="background:#ffffff;padding:0 32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #e8dcc8;">
        <tr>
          <td style="background:#7c0000;padding:10px 18px;">
            <span style="color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;">&#9888;&#65039;&nbsp; Obligation de restitution</span>
          </td>
        </tr>
        <tr>
          <td style="background:#fff8f8;padding:16px 18px;">
            <p style="margin:0;color:#4b0000;font-size:13px;line-height:1.8;">
              La restitution des clés est <strong>obligatoire avant le <span style="color:#7c0000;">${retShort}</span></strong>.<br>
              Tout retard non signalé entraîne la facturation d'un <strong style="color:#7c0000;">forfait minimum de 50&nbsp;€</strong>.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  ${delayBtn}

  <tr>
    <td style="padding:0;font-size:0;border-top:2px solid ${GOLD};">
      <img src="${footerUrl}" alt="LOTIER Immobilier — 40 rue Française 34500 Béziers"
           width="600" style="width:100%;max-width:600px;display:block;" />
    </td>
  </tr>

  <tr>
    <td style="background:#111827;padding:12px 40px;text-align:center;border-radius:0 0 16px 16px;">
      <p style="margin:0;color:#6b7280;font-size:10px;letter-spacing:0.05em;">
        Email automatique &mdash; Ne pas répondre &mdash;
        <a href="https://keymanager.io" style="color:${GOLD};text-decoration:none;font-weight:600;">KeyManager.io</a>
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
