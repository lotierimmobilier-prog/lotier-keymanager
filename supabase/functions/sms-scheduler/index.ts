import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * Job planifié pour l'envoi automatique des SMS
 * 
 * Ce job doit être appelé toutes les 10 minutes par un système de cron externe
 * (ex: cron-job.org, GitHub Actions, etc.)
 * 
 * Il gère:
 * 1. SMS de rappel 2h avant le retour prévu
 * 2. SMS d'alerte en cas de dépassement de l'heure de retour
 * 
 * Timezone: Europe/Paris
 */

interface Movement {
  id: string;
  agency_id: string;
  expected_return_at: string;
  contact_phone: string;
  given_to_name: string;
  keys: {
    label: string;
  };
  agencies: {
    name: string;
  };
}

interface SmsTemplate {
  content: string;
  enabled: boolean;
}

/**
 * Formate une date au format DD/MM/YYYY (timezone Europe/Paris)
 */
function formatDate(dateString: string): string {
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
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Rend un template SMS en remplaçant les variables
 */
function renderTemplate(template: string, context: Record<string, string>): string {
  let rendered = template;
  Object.entries(context).forEach(([key, value]) => {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  });
  return rendered;
}

/**
 * Envoie un SMS via l'Edge Function send-sms
 */
async function sendSms(params: {
  to: string;
  message: string;
  movementId: string;
  agencyId: string;
  type: 'key_due_2h' | 'key_overdue';
  supabaseUrl: string;
  serviceRoleKey: string;
}): Promise<boolean> {
  try {
    const response = await fetch(`${params.supabaseUrl}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: params.to,
        message: params.message,
        movementId: params.movementId,
        agencyId: params.agencyId,
        type: params.type,
      }),
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi du SMS:', error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Configuration Supabase manquante');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const twoHoursBefore = new Date(now.getTime() + 1.9 * 60 * 60 * 1000);

    let sentCount = 0;
    let errorCount = 0;

    // 1. SMS de rappel 2h avant le retour
    const { data: movementsDue2h } = await supabase
      .from('key_movements')
      .select(`
        id,
        agency_id,
        expected_return_at,
        contact_phone,
        given_to_name,
        keys!inner(label),
        agencies!inner(name)
      `)
      .is('returned_at', null)
      .eq('sms_due_2h_sent', false)
      .eq('disable_sms', false)
      .gte('expected_return_at', twoHoursBefore.toISOString())
      .lte('expected_return_at', twoHoursLater.toISOString());

    // Récupérer le template
    const { data: template2h } = await supabase
      .from('sms_templates')
      .select('content, enabled')
      .eq('code', 'key_due_2h')
      .maybeSingle();

    if (template2h?.enabled && movementsDue2h) {
      for (const movement of movementsDue2h as unknown as Movement[]) {
        if (!movement.contact_phone) continue;

        // Extraire le prénom du given_to_name
        const prenom = movement.given_to_name.split(' ')[0];

        const context = {
          prenom,
          reference_cle: movement.keys.label,
          date_retour: formatDate(movement.expected_return_at),
          heure_retour: formatTime(movement.expected_return_at),
          nom_agence: movement.agencies.name,
        };

        const message = renderTemplate(template2h.content, context);

        const success = await sendSms({
          to: movement.contact_phone,
          message,
          movementId: movement.id,
          agencyId: movement.agency_id,
          type: 'key_due_2h',
          supabaseUrl,
          serviceRoleKey,
        });

        if (success) {
          await supabase
            .from('key_movements')
            .update({ sms_due_2h_sent: true })
            .eq('id', movement.id);
          sentCount++;
        } else {
          errorCount++;
        }
      }
    }

    // 2. SMS d'alerte pour retard
    const { data: movementsOverdue } = await supabase
      .from('key_movements')
      .select(`
        id,
        agency_id,
        expected_return_at,
        contact_phone,
        given_to_name,
        keys!inner(label),
        agencies!inner(name)
      `)
      .is('returned_at', null)
      .eq('sms_overdue_sent', false)
      .eq('disable_sms', false)
      .lt('expected_return_at', now.toISOString());

    const { data: templateOverdue } = await supabase
      .from('sms_templates')
      .select('content, enabled')
      .eq('code', 'key_overdue')
      .maybeSingle();

    if (templateOverdue?.enabled && movementsOverdue) {
      for (const movement of movementsOverdue as unknown as Movement[]) {
        if (!movement.contact_phone) continue;

        const prenom = movement.given_to_name.split(' ')[0];

        const context = {
          prenom,
          reference_cle: movement.keys.label,
          date_retour: formatDate(movement.expected_return_at),
          heure_retour: formatTime(movement.expected_return_at),
          nom_agence: movement.agencies.name,
        };

        const message = renderTemplate(templateOverdue.content, context);

        const success = await sendSms({
          to: movement.contact_phone,
          message,
          movementId: movement.id,
          agencyId: movement.agency_id,
          type: 'key_overdue',
          supabaseUrl,
          serviceRoleKey,
        });

        if (success) {
          await supabase
            .from('key_movements')
            .update({ sms_overdue_sent: true })
            .eq('id', movement.id);
          sentCount++;
        } else {
          errorCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sentCount,
        errorCount,
        timestamp: now.toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erreur dans sms-scheduler:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});