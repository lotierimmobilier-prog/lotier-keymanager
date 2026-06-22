import { createClient } from 'npm:@supabase/supabase-js@2';

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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Créer l'utilisateur admin
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@keymanager.fr',
      password: 'jb2BSPORT',
      email_confirm: true,
      user_metadata: {
        first_name: 'Admin',
        last_name: 'KeyManager',
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    const userId = authData.user.id;
    const agencyId = 'c5816e17-d533-4456-b2a6-bafccdf72ea8';

    // Créer le profil utilisateur
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        agency_id: agencyId,
        first_name: 'Admin',
        last_name: 'KeyManager',
        email: 'admin@keymanager.fr',
        role: 'ADMIN',
      });

    if (userError) throw userError;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Admin account created successfully',
        user_id: userId,
        agency_id: agencyId,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
