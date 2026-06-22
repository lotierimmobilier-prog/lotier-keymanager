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

    // Get QR code from URL parameter
    const url = new URL(req.url);
    const qrCode = url.searchParams.get('code');

    if (!qrCode) {
      return new Response(
        JSON.stringify({ error: 'Code QR manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get QR code data with key and property info
    const { data: qrData, error: qrError } = await supabase
      .from('key_qr_codes')
      .select(`
        id,
        is_active,
        scan_count,
        keys(
          id,
          label,
          type,
          building_type,
          property_id,
          properties(
            id,
            reference,
            address,
            city,
            postal_code
          )
        ),
        agencies(
          id,
          name,
          logo_url
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

    // Check current status (is key currently out?)
    const { data: currentMovement } = await supabase
      .from('key_movements')
      .select('id, given_to_name, out_at, expected_return_at')
      .eq('key_id', qrData.keys.id)
      .eq('status', 'out')
      .order('out_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        success: true,
        qrCode,
        isActive: qrData.is_active,
        scanCount: qrData.scan_count,
        key: {
          label: qrData.keys.label,
          type: qrData.keys.type,
          buildingType: qrData.keys.building_type
        },
        property: qrData.keys.properties ? {
          reference: qrData.keys.properties.reference,
          address: qrData.keys.properties.address,
          city: qrData.keys.properties.city,
          postalCode: qrData.keys.properties.postal_code
        } : null,
        agency: {
          name: qrData.agencies.name,
          logoUrl: qrData.agencies.logo_url
        },
        currentStatus: currentMovement ? {
          isOut: true,
          takenBy: currentMovement.given_to_name,
          takenAt: currentMovement.out_at,
          expectedReturnAt: currentMovement.expected_return_at
        } : {
          isOut: false
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in qr-info:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});