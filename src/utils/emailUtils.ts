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
const DARK = '#1a1a1a';

export async function sendKeyCheckoutEmail(params: CheckoutEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) return { success: false, error: 'Non authentifié' };

    const appUrl = window.location.origin;
    const logoUrl = `${appUrl}/images/logo_rond.jpg`;
    const footerUrl = `${appUrl}/images/header_copie.png`;

    const outDate = new Date(params.outAt).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const returnDate = new Date(params.expectedReturnAt).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const keyListHtml = params.keyLabels
      .map(label => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f5f0e8;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${GOLD};margin-right:10px;vertical-align:middle;"></span>
            <span style="color:${DARK};font-size:14px;vertical-align:middle;">${label}</span>
          </td>
        </tr>`)
      .join('');

    const delayButtonHtml = params.movementId ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
        <tr>
          <td align="center">
            <p style="color:#6b7280;font-size:12px;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Besoin de plus de temps ?</p>
            <a href="${appUrl}/delay-request?id=${params.movementId}" target="_blank"
               style="display:inline-block;text-decoration:none;">
              <table cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;box-shadow:0 4px 14px rgba(184,146,74,0.35);">
                <tr>
                  <td style="background:${GOLD};padding:16px 36px;text-align:center;">
                    <span style="font-size:20px;line-height:1;">&#128336;</span>
                    <span style="display:block;color:#ffffff;font-size:15px;font-weight:700;letter-spacing:0.04em;margin-top:4px;text-transform:uppercase;">Demander un délai supplémentaire</span>
                    <span style="display:block;color:rgba(255,255,255,0.75);font-size:11px;margin-top:3px;">Votre demande sera transmise immédiatement à l'agence</span>
                  </td>
                </tr>
              </table>
            </a>
          </td>
        </tr>
      </table>
    ` : '';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Confirmation de remise de clés</title>
</head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Helvetica Neue',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header: logo -->
          <tr>
            <td align="center" style="background:#ffffff;border-radius:16px 16px 0 0;padding:32px 40px 24px;">
              <img src="${logoUrl}" alt="LOTIER Immobilier" width="100" height="100"
                   style="width:100px;height:100px;border-radius:50%;display:block;margin:0 auto;" />
              <div style="width:60px;height:2px;background:${GOLD};margin:18px auto 0;border-radius:2px;"></div>
            </td>
          </tr>

          <!-- Title band -->
          <tr>
            <td style="background:#ffffff;padding:0 40px 28px;text-align:center;">
              <h1 style="margin:0;color:${DARK};font-size:22px;font-weight:300;letter-spacing:0.06em;text-transform:uppercase;">
                Confirmation de remise de clés
              </h1>
              <p style="margin:8px 0 0;color:${GOLD};font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">
                LOTIER Immobilier — Gestion locative
              </p>
            </td>
          </tr>

          <!-- Gold divider -->
          <tr>
            <td style="background:#ffffff;padding:0 40px;">
              <div style="height:1px;background:linear-gradient(to right,transparent,${GOLD},transparent);"></div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:28px 40px 8px;">
              <p style="margin:0 0 6px;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Destinataire</p>
              <p style="margin:0 0 24px;color:${DARK};font-size:16px;font-weight:600;">
                ${params.contactName}
              </p>
              <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.7;">
                Nous vous confirmons la remise des clés ci-dessous pour le bien référencé.
                Veuillez conserver cet email comme <strong style="color:${DARK};">justificatif officiel</strong>.
              </p>
            </td>
          </tr>

          <!-- Keys box -->
          <tr>
            <td style="background:#ffffff;padding:0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#fdfaf4;border:1px solid #e8dcc8;border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="padding:12px 16px;background:${GOLD};">
                    <span style="color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">
                      &#128273;&nbsp; Clés remises
                    </span>
                  </td>
                </tr>
                ${keyListHtml}
              </table>
            </td>
          </tr>

          <!-- Details table -->
          <tr>
            <td style="background:#ffffff;padding:0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid #e8dcc8;">
                <tr style="background:#fdfaf4;">
                  <td style="padding:11px 16px;border-bottom:1px solid #e8dcc8;color:#9a8060;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;width:38%;">
                    Référence bien
                  </td>
                  <td style="padding:11px 16px;border-bottom:1px solid #e8dcc8;color:${DARK};font-size:14px;font-weight:700;">
                    ${params.propertyReference}
                  </td>
                </tr>
                <tr>
                  <td style="padding:11px 16px;border-bottom:1px solid #e8dcc8;color:#9a8060;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;">
                    Adresse
                  </td>
                  <td style="padding:11px 16px;border-bottom:1px solid #e8dcc8;color:#333;font-size:13px;">
                    ${params.propertyAddress}
                  </td>
                </tr>
                <tr style="background:#fdfaf4;">
                  <td style="padding:11px 16px;border-bottom:1px solid #e8dcc8;color:#9a8060;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;">
                    Date de sortie
                  </td>
                  <td style="padding:11px 16px;border-bottom:1px solid #e8dcc8;color:#333;font-size:13px;">
                    ${outDate}
                  </td>
                </tr>
                <tr>
                  <td style="padding:11px 16px;color:#9a8060;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;">
                    Retour prévu
                  </td>
                  <td style="padding:11px 16px;color:${GOLD};font-size:15px;font-weight:700;">
                    ${returnDate}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Penalty notice -->
          <tr>
            <td style="background:#ffffff;padding:0 40px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:${DARK};border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="padding:6px 16px;background:${GOLD};">
                    <span style="color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">
                      &#9888;&#65039; Obligation de restitution
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0;color:#e2e8f0;font-size:13px;line-height:1.7;">
                      La restitution des clés est <strong style="color:${GOLD};">obligatoire</strong> avant le
                      <strong style="color:#ffffff;">${returnDate}</strong>.<br>
                      Tout retard non signalé entraînera la facturation d'un
                      <strong style="color:${GOLD};">forfait minimum de 50&nbsp;€</strong>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Delay button -->
          <tr>
            <td style="background:#ffffff;padding:0 40px 36px;">
              ${delayButtonHtml}
            </td>
          </tr>

          <!-- Gold divider -->
          <tr>
            <td style="background:#ffffff;padding:0 40px;">
              <div style="height:1px;background:linear-gradient(to right,transparent,${GOLD},transparent);"></div>
            </td>
          </tr>

          <!-- Footer image: LOTIER full header -->
          <tr>
            <td style="background:#ffffff;border-radius:0 0 16px 16px;padding:20px 0 0;">
              <img src="${footerUrl}" alt="LOTIER Immobilier"
                   width="600" style="width:100%;max-width:600px;display:block;border-radius:0 0 16px 16px;" />
            </td>
          </tr>

          <!-- Sub-footer -->
          <tr>
            <td align="center" style="padding:16px 0;">
              <p style="color:#a0917a;font-size:11px;margin:0;">
                Email automatique — <a href="https://keymanager.io" style="color:${GOLD};text-decoration:none;">KeyManager.io</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
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
          subject: `Remise de clés – ${params.propertyReference} – retour le ${returnDate}`,
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
