import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // GET — load movement details for the delay request page
    if (req.method === "GET") {
      const url = new URL(req.url);
      const movementId = url.searchParams.get("id");

      if (!movementId) {
        return new Response(
          JSON.stringify({ success: false, error: "id requis" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: movement, error } = await supabase
        .from("key_movements")
        .select(`
          id, given_to_name, out_at, expected_return_at, returned_at,
          delay_requested_at, delay_request_status,
          keys!inner ( label, properties ( reference, address ) ),
          agency:agency_id ( name, logo_url, primary_color, address, email_smtp_host )
        `)
        .eq("id", movementId)
        .single();

      if (error || !movement) {
        return new Response(
          JSON.stringify({ success: false, error: "Mouvement introuvable" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, movement }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST — submit a delay request
    if (req.method === "POST") {
      const { movementId, message, newReturnDate } = await req.json();

      if (!movementId) {
        return new Response(
          JSON.stringify({ success: false, error: "movementId requis" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: movement, error: fetchError } = await supabase
        .from("key_movements")
        .select("id, returned_at, delay_request_status")
        .eq("id", movementId)
        .single();

      if (fetchError || !movement) {
        return new Response(
          JSON.stringify({ success: false, error: "Mouvement introuvable" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (movement.returned_at) {
        return new Response(
          JSON.stringify({ success: false, error: "Cette clé a déjà été rendue" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (movement.delay_request_status === "pending") {
        return new Response(
          JSON.stringify({ success: false, error: "Une demande est déjà en attente" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabase
        .from("key_movements")
        .update({
          delay_requested_at: new Date().toISOString(),
          delay_request_message: message || null,
          delay_requested_new_date: newReturnDate || null,
          delay_request_status: "pending",
          // Reset previous response if re-requesting
          delay_response_message: null,
          delay_responded_at: null,
          delay_responded_by: null,
        })
        .eq("id", movementId);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Méthode non supportée" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("delay-request error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
