// Public endpoint: { token, newPassword } -> validates the token (unused,
// unexpired), sets the new password via the Admin API, and marks the
// token used so it can't be replayed.
//
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase.

import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, newPassword } = await req.json();
    if (!token || !newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return json({ error: "Invalid request." }, 400);
    }

    const tokenHash = await sha256Hex(token);
    const { data: resetRow, error: lookupError } = await supabase
      .from("password_reset_tokens")
      .select("id, user_id, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!resetRow || resetRow.used_at || new Date(resetRow.expires_at) < new Date()) {
      return json({ error: "This reset link is invalid or has expired." }, 400);
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(resetRow.user_id, {
      password: newPassword,
    });
    if (updateError) throw updateError;

    await supabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", resetRow.id);

    return json({ message: "Password updated." });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong." }, 500);
  }
});
