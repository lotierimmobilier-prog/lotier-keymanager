import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { agencyName, firstName, lastName, userId, email } = await req.json();

    if (!agencyName || !firstName || !lastName || !userId || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Confirming user email for:', userId);
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email_confirm: true }
    );

    if (confirmError) {
      console.error('Email confirmation error:', confirmError);
    }

    const { data: freePlan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('id')
      .eq('name', 'Gratuit')
      .maybeSingle();

    if (planError || !freePlan) {
      console.error('Plan error:', planError);
      return new Response(
        JSON.stringify({ error: 'Plan gratuit non trouvé' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: agency, error: agencyError } = await supabaseAdmin
      .from('agencies')
      .insert({
        name: agencyName,
        plan_id: freePlan.id,
        max_keys: 3,
        primary_color: '#f59e0b',
        secondary_color: '#ea580c',
        accent_color: '#fbbf24',
        sidebar_bg: '#1e293b',
        sidebar_text: '#ffffff',
      })
      .select()
      .single();

    if (agencyError || !agency) {
      console.error('Agency error:', agencyError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création de l\'agence' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating user with id:', userId, 'agency_id:', agency.id);
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        agency_id: agency.id,
        first_name: firstName,
        last_name: lastName,
        email,
        role: 'ADMIN',
      });

    if (userError) {
      console.error('User error:', userError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création de l\'utilisateur', details: userError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User created successfully!');

    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        agency_id: agency.id,
        plan_id: freePlan.id,
        current_keys_limit: 3,
        status: 'active',
      });

    if (subError) {
      console.error('Subscription error:', subError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création de l\'abonnement' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, agencyId: agency.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Complete signup error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});