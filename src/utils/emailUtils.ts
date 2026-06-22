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
const SLATE = '#374151';

export async function sendKeyCheckoutEmail(params: CheckoutEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) return { success: false, error: 'Non authentifié' };

    const appUrl = window.location.origin;
    const logoUrl = `${appUrl}/images/logo_rond.jpg`;
    const footerBanner = `${appUrl}/images/header_copie.png`;

    const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const fmtShort = (iso: string) => new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const outDate   = fmt(params.outAt);
    const retDate   = fmt(params.expectedReturnAt);
    const retShort  = fmtShort(params.expectedReturnAt);

    const keyRows = params.keyLabels.map(label => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f0ead8;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="width:28px;height:28px;background:${GOLD};border-radius:50%;text-align:center;vertical-align:middle;font-size:14px;">
              &#128273;
            </td>
            <td style="padding-left:12px;color:${DARK};font-size:14px;font-weight:500;">${label}</td>
          </tr></table>
        </td>
      </tr>`).join('');

    const delayBtn = params.movementId ? `
      <tr>
        <td style="padding:0 32px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:20px 0 12px;text-align:center;">
                <div style="display:inline-block;width:40px;height:1px;background:#d4af72;vertical-align:middle;"></div>
                <span style="color:#9a8a6a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;vertical-align:middle;padding:0 12px;">Vous avez besoin de plus de temps ?</span>
                <div style="display:inline-block;width:40px;height:1px;background:#d4af72;vertical-align:middle;"></div>
              </td>
            </tr>
            <tr>
              <td align="center">
                <a href="${appUrl}/delay-request?id=${params.movementId}" target="_blank"
                   style="display:block;text-decoration:none;max-width:460px;margin:0 auto;">
                  <table width="100%" cellpadding="0" cellspacing="0"
                         style="background:linear-gradient(135deg,#1a1a1a 0%,#2d2010 100%);border-radius:14px;overflow:hidden;border:2px solid ${GOLD};">
                    <tr>
                      <td style="padding:4px 0;background:${GOLD};text-align:center;">
                        <span style="color:#fff;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.15em;">Action requise si nécessaire</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:20px 28px;">
                        <table width="100%" cellpadding="0" cellspacing="0"><tr>
                          <td style="width:52px;vertical-align:middle;">
                            <div style="width:52px;height:52px;background:rgba(184,146,74,0.15);border:2px solid ${GOLD};border-radius:12px;text-align:center;line-height:52px;font-size:24px;">
                              &#9200;
                            </div>
                          </td>
                          <td style="padding-left:16px;vertical-align:middle;">
                            <p style="margin:0 0 3px;color:#ffffff;font-size:16px;font-weight:700;letter-spacing:0.02em;">
                              Demander un délai supplémentaire
                            </p>
                            <p style="margin:0;color:#c4a55a;font-size:12px;">
                              Votre demande sera transmise immédiatement à l'agence
                            </p>
                          </td>
                          <td style="width:28px;text-align:right;vertical-align:middle;">
                            <span style="color:${GOLD};font-size:22px;font-weight:300;">&#8250;</span>
                          </td>
                        </tr></table>
                      </td>
                    </tr>
                  </table>
                </a>
              </td>
            </tr>
          </table>
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

  <!-- Gold top stripe -->
  <tr>
    <td style="background:${GOLD};height:5px;border-radius:16px 16px 0 0;font-size:0;">&nbsp;</td>
  </tr>

  <!-- Logo header -->
  <tr>
    <td style="background:#ffffff;padding:36px 40px 28px;text-align:center;">
      <img src="${logoUrl}" alt="LOTIER Immobilier" width="110" height="110"
           style="width:110px;height:110px;border-radius:50%;display:block;margin:0 auto 18px;" />
      <p style="margin:0;color:#9a8060;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;">
        Gestion Locative
      </p>
    </td>
  </tr>

  <!-- Gradient divider -->
  <tr>
    <td style="background:#ffffff;padding:0 40px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="height:1px;background:#e8dcc8;font-size:0;">&nbsp;</td>
      </tr></table>
    </td>
  </tr>

  <!-- Hero band -->
  <tr>
    <td style="background:#ffffff;padding:28px 40px 24px;text-align:center;">
      <h1 style="margin:0;color:${DARK};font-size:26px;font-weight:300;letter-spacing:0.08em;text-transform:uppercase;line-height:1.2;">
        Confirmation de<br>
        <strong style="font-weight:800;color:${GOLD};">Remise de Clés</strong>
      </h1>
    </td>
  </tr>

  <!-- Greeting -->
  <tr>
    <td style="background:#ffffff;padding:4px 40px 24px;">
      <p style="margin:0;color:${SLATE};font-size:15px;line-height:1.7;text-align:center;">
        Bonjour <strong style="color:${DARK};">${params.contactName}</strong>,<br>
        <span style="color:#6b7280;font-size:13px;">Veuillez trouver ci-dessous la confirmation de remise de clés.<br>
        Conservez cet email comme <strong>justificatif officiel</strong>.</span>
      </p>
    </td>
  </tr>

  <!-- Keys section -->
  <tr>
    <td style="background:#ffffff;padding:0 32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="border:1px solid #e8dcc8;border-radius:12px;overflow:hidden;">
        <!-- Section header -->
        <tr>
          <td style="background:#faf6ef;padding:12px 16px;border-bottom:2px solid ${GOLD};">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="color:${GOLD};font-size:14px;padding-right:8px;">&#128273;</td>
              <td style="color:${DARK};font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;">
                Clés remises
              </td>
            </tr></table>
          </td>
        </tr>
        ${keyRows}
      </table>
    </td>
  </tr>

  <!-- Property + Dates: two-col -->
  <tr>
    <td style="background:#ffffff;padding:0 32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #e8dcc8;">
        <tr>
          <td style="background:#faf6ef;padding:12px 16px;border-bottom:2px solid ${GOLD};">
            <span style="color:${DARK};font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;">
              &#127968;&nbsp; Bien concerné
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #f0ead8;">
            <span style="color:#9a8060;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:3px;">Référence</span>
            <span style="color:${DARK};font-size:15px;font-weight:700;">${params.propertyReference}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 16px;">
            <span style="color:#9a8060;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:3px;">Adresse</span>
            <span style="color:${SLATE};font-size:14px;">${params.propertyAddress}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Date timeline -->
  <tr>
    <td style="background:#ffffff;padding:0 32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <!-- Out date -->
          <td width="44%" style="background:#f8f9fa;border:1px solid #e8dcc8;border-radius:10px;padding:14px 16px;vertical-align:top;">
            <span style="color:#9a8060;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:6px;">
              &#128197;&nbsp; Remis le
            </span>
            <span style="color:${DARK};font-size:13px;font-weight:600;">${outDate}</span>
          </td>
          <!-- Arrow -->
          <td width="12%" style="text-align:center;vertical-align:middle;">
            <span style="color:${GOLD};font-size:24px;font-weight:300;">&#8594;</span>
          </td>
          <!-- Return date -->
          <td width="44%" style="background:${DARK};border:2px solid ${GOLD};border-radius:10px;padding:14px 16px;vertical-align:top;">
            <span style="color:${GOLD_LIGHT};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:6px;">
              &#9201;&nbsp; À rendre avant le
            </span>
            <span style="color:#ffffff;font-size:13px;font-weight:700;">${retDate}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Penalty notice -->
  <tr>
    <td style="background:#ffffff;padding:0 32px 28px;">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="border-radius:12px;overflow:hidden;border:1px solid #e8dcc8;">
        <tr>
          <td style="background:#7c0000;padding:10px 18px;">
            <span style="color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;">
              &#9888;&#65039;&nbsp; Obligation de restitution
            </span>
          </td>
        </tr>
        <tr>
          <td style="background:#fff8f8;padding:16px 18px;">
            <p style="margin:0;color:#4b0000;font-size:13px;line-height:1.8;">
              La restitution des clés est <strong>obligatoire avant le
              <span style="color:#7c0000;">${retShort}</span></strong>.<br>
              Tout retard non signalé entraîne la facturation d'un
              <strong style="color:#7c0000;">forfait minimum de 50&nbsp;€</strong>
              sans préjudice des frais supplémentaires éventuels.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Delay CTA -->
  ${delayBtn}

  <!-- Footer: LOTIER banner -->
  <tr>
    <td style="padding:0;font-size:0;">
      <img src="${footerBanner}" alt="LOTIER Immobilier — 40 rue Française 34500 Béziers"
           width="600" style="width:100%;max-width:600px;display:block;border-top:2px solid ${GOLD};" />
    </td>
  </tr>

  <!-- Sub-footer -->
  <tr>
    <td style="background:#1a1a1a;padding:12px 40px;text-align:center;border-radius:0 0 16px 16px;">
      <p style="margin:0;color:#6b7280;font-size:10px;letter-spacing:0.05em;">
        Email automatique envoyé via
        <a href="https://keymanager.io" style="color:${GOLD};text-decoration:none;font-weight:600;">KeyManager.io</a>
        &mdash; Ne pas répondre à cet email
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
