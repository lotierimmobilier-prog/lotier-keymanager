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

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { movementId, message } = await req.json();

    if (!movementId) {
      return new Response(
        JSON.stringify({ success: false, error: "movementId requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: movement, error: fetchError } = await supabase
      .from("key_movements")
      .select("id, returned_at, delay_requested_at")
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

    const { error: updateError } = await supabase
      .from("key_movements")
      .update({
        delay_requested_at: new Date().toISOString(),
        delay_request_message: message || null,
      })
      .eq("id", movementId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("delay-request error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
