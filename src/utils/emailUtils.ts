import { supabase } from '../lib/supabase';

interface CheckoutEmailParams {
  agencyId: string;
  agencyName: string;
  contactEmail: string;
  contactName: string;
  keyLabels: string[];
  propertyReference: string;
  propertyAddress: string;
  outAt: string;
  expectedReturnAt: string;
  agencySignature?: string;
  providerSignature?: string;
}

export async function sendKeyCheckoutEmail(params: CheckoutEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) return { success: false, error: 'Non authentifié' };

    const gpsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(params.propertyAddress)}`;

    const outDate = new Date(params.outAt).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const returnDate = new Date(params.expectedReturnAt).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const keyListHtml = params.keyLabels
      .map(label => `<li style="padding: 4px 0; color: #374151;">🔑 ${label}</li>`)
      .join('');

    const signaturesHtml = (params.agencySignature || params.providerSignature) ? `
      <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <h3 style="color: #374151; font-size: 16px; margin: 0 0 16px;">Signatures</h3>
        <div style="display: flex; gap: 24px; flex-wrap: wrap;">
          ${params.agencySignature ? `
          <div style="flex: 1; min-width: 200px;">
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">Signature agence</p>
            <img src="${params.agencySignature}" alt="Signature agence" style="border: 1px solid #d1d5db; border-radius: 8px; max-width: 200px; width: 100%;" />
          </div>` : ''}
          ${params.providerSignature ? `
          <div style="flex: 1; min-width: 200px;">
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">Signature prestataire</p>
            <img src="${params.providerSignature}" alt="Signature prestataire" style="border: 1px solid #d1d5db; border-radius: 8px; max-width: 200px; width: 100%;" />
          </div>` : ''}
        </div>
      </div>
    ` : '';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0; padding:0; background:#f9fafb; font-family: Arial, Helvetica, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">

    <div style="background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 16px; padding: 32px 24px; text-align: center; margin-bottom: 24px;">
      <div style="width: 56px; height: 56px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/>
          <path d="m21 2-9.6 9.6"/>
          <circle cx="7.5" cy="15.5" r="5.5"/>
        </svg>
      </div>
      <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">Confirmation de remise de clés</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 15px;">${params.agencyName}</p>
    </div>

    <div style="background: white; border-radius: 16px; border: 1px solid #e5e7eb; padding: 28px; margin-bottom: 16px;">
      <p style="color: #374151; margin: 0 0 20px;">Bonjour <strong>${params.contactName}</strong>,</p>
      <p style="color: #374151; margin: 0 0 24px;">
        Nous vous confirmons la remise des clés suivantes. Veuillez conserver cet email comme justificatif.
      </p>

      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
        <h3 style="color: #92400e; font-size: 14px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.05em;">Clés remises</h3>
        <ul style="margin: 0; padding: 0 0 0 20px;">
          ${keyListHtml}
        </ul>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px; width: 45%;">Référence bien</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 600;">${params.propertyReference}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px;">Adresse</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827;">${params.propertyAddress}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px;">Date de sortie</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827;">${outDate}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-size: 13px;">Retour prévu</td>
          <td style="padding: 10px 0; color: #dc2626; font-weight: 700;">${returnDate}</td>
        </tr>
      </table>

      <a href="${gpsUrl}" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; background: #2563eb; color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        Voir sur Google Maps
      </a>

      ${signaturesHtml}
    </div>

    <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
      <p style="color: #92400e; margin: 0; font-size: 13px;">
        <strong>⚠️ Rappel :</strong> Les clés doivent être restituées avant le <strong>${returnDate}</strong>.
        Tout retard devra être signalé à l'agence.
      </p>
    </div>

    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      Cet email a été envoyé automatiquement par ${params.agencyName} via KeyManager.io
    </p>
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
          subject: `Confirmation de remise de clés - ${params.propertyReference}`,
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
