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

export async function sendKeyCheckoutEmail(params: CheckoutEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) return { success: false, error: 'Non authentifié' };

    const outDate = new Date(params.outAt).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const returnDate = new Date(params.expectedReturnAt).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const keyListHtml = params.keyLabels
      .map(label => `<li style="padding:5px 0;color:#334155;font-size:14px;">&#128273; ${label}</li>`)
      .join('');

    const delayButtonHtml = params.movementId ? `
      <div style="margin-top:24px;text-align:center;">
        <a href="${window.location.origin}/delay-request?id=${params.movementId}"
           target="_blank"
           style="display:inline-block;padding:12px 28px;background:#1E293B;color:#D97706;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none;letter-spacing:0.03em;border:2px solid #D97706;">
          &#128336; Demander un délai supplémentaire
        </a>
        <p style="color:#94a3b8;font-size:11px;margin:10px 0 0;">Cette demande sera transmise immédiatement à l'agence.</p>
      </div>
    ` : '';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:#1E293B;border-radius:16px 16px 0 0;padding:32px 28px;text-align:center;">
      <div style="display:inline-block;background:#D97706;border-radius:10px;padding:10px 20px;margin-bottom:14px;">
        <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">LOTIER</span>
      </div>
      <h1 style="color:#f1f5f9;margin:0;font-size:20px;font-weight:700;">Confirmation de remise de clés</h1>
      <p style="color:#94a3b8;margin:6px 0 0;font-size:14px;">${params.agencyName}</p>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:28px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">

      <p style="color:#334155;margin:0 0 8px;font-size:15px;">Bonjour <strong>${params.contactName}</strong>,</p>
      <p style="color:#64748b;margin:0 0 24px;font-size:14px;line-height:1.6;">
        Nous vous confirmons la remise des clés suivantes pour le bien référencé ci-dessous.<br>
        Conservez cet email comme justificatif.
      </p>

      <!-- Keys -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #D97706;border-radius:8px;padding:16px;margin-bottom:20px;">
        <p style="color:#92400e;font-size:11px;font-weight:700;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.07em;">Clés remises</p>
        <ul style="margin:0;padding:0 0 0 16px;">
          ${keyListHtml}
        </ul>
      </div>

      <!-- Details -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:12px;width:42%;text-transform:uppercase;letter-spacing:0.05em;">Référence bien</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-weight:700;font-size:14px;">${params.propertyReference}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Adresse</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#334155;font-size:14px;">${params.propertyAddress}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Date de sortie</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#334155;font-size:14px;">${outDate}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Retour prévu</td>
          <td style="padding:10px 0;color:#D97706;font-weight:700;font-size:15px;">${returnDate}</td>
        </tr>
      </table>

      <!-- Penalty notice -->
      <div style="background:#1E293B;border-radius:10px;padding:18px 20px;margin-bottom:8px;">
        <p style="color:#f8fafc;font-size:13px;margin:0 0 6px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">
          &#9888;&#65039; Obligation de restitution
        </p>
        <p style="color:#cbd5e1;font-size:13px;margin:0;line-height:1.6;">
          La restitution des clés est <strong style="color:#fbbf24;">obligatoire</strong> avant le <strong style="color:#fbbf24;">${returnDate}</strong>.
          Tout retard non signalé entraînera la facturation d'un <strong style="color:#fbbf24;">forfait minimum de 50&nbsp;€</strong>.
        </p>
      </div>

      ${delayButtonHtml}
    </div>

    <!-- Footer -->
    <div style="background:#1E293B;border-radius:0 0 16px 16px;padding:16px 28px;text-align:center;">
      <p style="color:#475569;font-size:11px;margin:0;">
        Email automatique envoyé par <span style="color:#D97706;font-weight:600;">${params.agencyName}</span> via KeyManager.io
      </p>
    </div>

  </div>
</body>
</html>
    `.trim();

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
