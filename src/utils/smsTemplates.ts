/**
 * Utilitaire pour le rendu des templates SMS
 *
 * Ce fichier fournit des fonctions pour :
 * - Rendre les templates SMS avec des variables dynamiques
 * - Formatter les dates et heures au format français (Europe/Paris)
 * - Envoyer des SMS via l'Edge Function
 */

import { supabase } from '../lib/supabase';

interface SmsContext {
  prenom?: string;
  nom?: string;
  telephone?: string;
  reference_cle?: string;
  date_retour?: string;
  heure_retour?: string;
  date_prise?: string;
  heure_prise?: string;
  nom_agence?: string;
}

/**
 * Formate une date au format DD/MM/YYYY (timezone Europe/Paris)
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formate une heure au format HH:mm (timezone Europe/Paris)
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Rend un template SMS en remplaçant les variables {{variable}} par leurs valeurs
 *
 * @param templateContent - Le contenu du template avec des variables
 * @param context - L'objet contenant les valeurs à remplacer
 * @returns Le template rendu avec les valeurs
 */
export function renderSmsTemplate(templateContent: string, context: SmsContext): string {
  let rendered = templateContent;

  Object.entries(context).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(placeholder, 'g'), value || '');
  });

  return rendered;
}

/**
 * Récupère un template SMS depuis la base de données
 */
export async function getSmsTemplate(code: string): Promise<{ content: string; enabled: boolean } | null> {
  try {
    const { data, error } = await supabase
      .from('sms_templates')
      .select('content, enabled')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      console.error('Erreur lors de la récupération du template SMS:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception lors de la récupération du template SMS:', error);
    return null;
  }
}

/**
 * Envoie un SMS via l'Edge Function send-sms
 */
export async function sendSms(params: {
  to: string;
  message: string;
  movementId?: string;
  contactId?: string;
  agencyId: string;
  type: 'key_taken' | 'key_due_2h' | 'key_overdue';
}): Promise<{ success: boolean; error?: string }> {
  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`;

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'Non authentifié' };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Erreur lors de l\'envoi du SMS:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Prépare et envoie un SMS de type "clé prise"
 */
export async function sendKeyTakenSms(params: {
  contactFirstName: string;
  contactLastName: string;
  contactPhone: string;
  keyLabel: string;
  outAt: string;
  expectedReturnAt: string;
  agencyName: string;
  agencyId: string;
  movementId: string;
  contactId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const template = await getSmsTemplate('key_taken');

  if (!template || !template.enabled) {
    return { success: false, error: 'Template désactivé ou introuvable' };
  }

  const context: SmsContext = {
    prenom: params.contactFirstName,
    nom: params.contactLastName,
    telephone: params.contactPhone,
    reference_cle: params.keyLabel,
    date_prise: formatDate(params.outAt),
    heure_prise: formatTime(params.outAt),
    date_retour: formatDate(params.expectedReturnAt),
    heure_retour: formatTime(params.expectedReturnAt),
    nom_agence: params.agencyName,
  };

  const message = renderSmsTemplate(template.content, context);

  return sendSms({
    to: params.contactPhone,
    message,
    movementId: params.movementId,
    contactId: params.contactId,
    agencyId: params.agencyId,
    type: 'key_taken',
  });
}
