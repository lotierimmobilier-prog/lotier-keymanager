import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuration Supabase manquante');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const qrCode = url.searchParams.get('code');

    if (!qrCode) {
      return new Response(
        JSON.stringify({ error: 'Code QR manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: qrData, error: qrError } = await supabase
      .from('property_qr_codes')
      .select(`
        id,
        is_active,
        scan_count,
        property:properties(
          id,
          reference,
          address,
          postal_code,
          city,
          building,
          floor,
          door,
          keys(
            id,
            label,
            status
          )
        ),
        agency:agencies(
          id,
          name,
          logo_url,
          primary_color,
          secondary_color
        )
      `)
      .eq('qr_code', qrCode)
      .maybeSingle();

    if (qrError || !qrData) {
      return new Response(
        JSON.stringify({ error: 'QR Code non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!qrData.is_active) {
      return new Response(
        JSON.stringify({ 
          error: 'Ce QR Code a été désactivé',
          isActive: false
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const activeKeys = qrData.property.keys.filter((k: any) => k.status !== 'ARCHIVED');

    return new Response(
      JSON.stringify({
        success: true,
        qrCode,
        isActive: qrData.is_active,
        scanCount: qrData.scan_count,
        property: {
          reference: qrData.property.reference,
          address: qrData.property.address,
          city: qrData.property.city || '',
          postalCode: qrData.property.postal_code || '',
          building: qrData.property.building || '',
          floor: qrData.property.floor || '',
          door: qrData.property.door || '',
          keyCount: activeKeys.length,
          keys: activeKeys.map((k: any) => ({
            id: k.id,
            label: k.label,
            type: k.status
          }))
        },
        agency: {
          name: qrData.agency.name,
          logoUrl: qrData.agency.logo_url,
          primaryColor: qrData.agency.primary_color || '#f59e0b',
          secondaryColor: qrData.agency.secondary_color || '#ea580c'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in property-qr-info:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});