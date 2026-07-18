import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!clientId || !clientSecret) {
    return jsonResponse(
      {
        error:
          "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET Edge secrets",
      },
      500,
    )
  }

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Missing Supabase env" }, 500)
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return jsonResponse({ error: "Missing Authorization header" }, 401)
  }

  // Verify the caller with their JWT (anon client + user token).
  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser()

  if (userError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401)
  }

  // Refresh token must not be readable by the browser client — use service role.
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: tokenRow, error: tokenError } = await supabaseAdmin
    .from("google_calendar_tokens")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle()

  if (tokenError) {
    return jsonResponse({ error: tokenError.message }, 500)
  }

  if (!tokenRow?.refresh_token) {
    return jsonResponse(
      { error: "No calendar tokens; reconnect Google Calendar" },
      404,
    )
  }

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokenRow.refresh_token,
      grant_type: "refresh_token",
    }),
  })

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string
    expires_in?: number
    refresh_token?: string
    error?: string
    error_description?: string
  }

  if (!tokenRes.ok || !tokenJson.access_token) {
    const code = tokenJson.error ?? "token_refresh_failed"
    const description =
      tokenJson.error_description ?? "Failed to refresh Google access token"
    const status = code === "invalid_grant" ? 401 : 502
    return jsonResponse(
      { error: code, error_description: description, needs_reauth: true },
      status,
    )
  }

  const expiresIn = tokenJson.expires_in ?? 3600
  const expiry = new Date(Date.now() + expiresIn * 1000).toISOString()
  const nextRefresh = tokenJson.refresh_token ?? tokenRow.refresh_token

  const { error: updateError } = await supabaseAdmin
    .from("google_calendar_tokens")
    .update({
      access_token: tokenJson.access_token,
      refresh_token: nextRefresh,
      expiry,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)

  if (updateError) {
    return jsonResponse({ error: updateError.message }, 500)
  }

  return jsonResponse({
    access_token: tokenJson.access_token,
    expiry,
  })
})
