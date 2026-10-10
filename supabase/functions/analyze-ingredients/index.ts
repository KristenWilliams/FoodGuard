import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Deprecated: API Key login uses the Node API; no anonymous/shared-key fallback.
Deno.serve((request) => new Response(request.method === "OPTIONS" ? null : JSON.stringify({
  error: "This legacy endpoint is disabled. Use the FoodGuard API with your own API Key.",
}), {
  status: request.method === "OPTIONS" ? 204 : 410,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" },
}));
