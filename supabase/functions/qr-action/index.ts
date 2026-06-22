import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface QrActionRequest {
  qrCode: string;
  action: 'take' | 'drop';
  userName: string;
  userPhone?: string;
  userEmail?: string;
  locationLat?: number;
  locationLng?: number;
  notes?: string;
  photoUrl?: string;
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuration Supabase manquante');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      qrCode,
      action,
      userName,
      userPhone,
      userEmail,
      locationLat,
      locationLng,
      notes,
      photoUrl
    }: QrActionRequest = await req.json();

    if (!qrCode || !action || !userName) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants (qrCode, action, userName requis)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action !== 'take' && action !== 'drop') {
      return new Response(
        JSON.stringify({ error: 'Action invalide (take ou drop)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get QR code data
    const { data: qrData, error: qrError } = await supabase
      .from('key_qr_codes')
      .select('id, key_id, agency_id, is_active, keys(id, label, property_id, properties(id, reference, address))')
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
        JSON.stringify({ error: 'Ce QR Code a été désactivé' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client IP and user agent
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Create scan log
    const { error: scanLogError } = await supabase
      .from('qr_scan_logs')
      .insert({
        qr_code_id: qrData.id,
        key_id: qrData.key_id,
        action,
        user_name: userName,
        user_phone: userPhone || null,
        user_email: userEmail || null,
        location_lat: locationLat || null,
        location_lng: locationLng || null,
        photo_url: photoUrl || null,
        notes: notes || null,
        ip_address: ipAddress,
        user_agent: userAgent,
        agency_id: qrData.agency_id
      });

    if (scanLogError) {
      console.error('Error creating scan log:', scanLogError);
    }

    // Update scan count and last scanned date
    await supabase
      .from('key_qr_codes')
      .update({
        scan_count: supabase.rpc('increment', { row_id: qrData.id }),
        last_scanned_at: new Date().toISOString()
      })
      .eq('id', qrData.id);

    // Create key movement
    const now = new Date();
    let movementData: any = {
      key_id: qrData.key_id,
      given_to_name: userName,
      contact_phone: userPhone || null,
      agency_id: qrData.agency_id,
      created_via_qr: true,
      qr_code_id: qrData.id
    };

    if (action === 'take') {
      // Create outgoing movement
      const expectedReturn = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h by default
      movementData.out_at = now.toISOString();
      movementData.expected_return_at = expectedReturn.toISOString();
      movementData.status = 'out';
    } else {
      // Find the last outgoing movement for this key
      const { data: lastMovement } = await supabase
        .from('key_movements')
        .select('id')
        .eq('key_id', qrData.key_id)
        .eq('status', 'out')
        .order('out_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastMovement) {
        // Update existing movement with return
        await supabase
          .from('key_movements')
          .update({
            returned_at: now.toISOString(),
            returned_by_name: userName,
            status: 'returned'
          })
          .eq('id', lastMovement.id);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Clé déposée avec succès',
            action: 'drop',
            keyLabel: qrData.keys?.label || 'Clé'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // No outgoing movement found, create a return-only movement
        movementData.returned_at = now.toISOString();
        movementData.returned_by_name = userName;
        movementData.status = 'returned';
      }
    }

    const { error: movementError } = await supabase
      .from('key_movements')
      .insert(movementData);

    if (movementError) {
      console.error('Error creating movement:', movementError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'enregistrement du mouvement' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Send SMS notification if configured

    return new Response(
      JSON.stringify({
        success: true,
        message: action === 'take' ? 'Clé prise avec succès' : 'Clé déposée avec succès',
        action,
        keyLabel: qrData.keys?.label || 'Clé'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in qr-action:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});