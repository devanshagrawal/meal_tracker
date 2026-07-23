// Public endpoint: { username } -> always returns a generic success message
// (never reveals whether the username exists or has a recovery email, to
// avoid username enumeration). If the username has a recovery_email on
// file, emails a one-time reset link via Resend.
//
// Required secrets:
//   RESEND_API_KEY - from resend.com
//   APP_URL        - e.g. https://meal-tracker-sooty-eta.vercel.app
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase.

import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_URL = Deno.env.get("APP_URL")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENERIC_RESPONSE = new Response(
  JSON.stringify({ message: "If that username has a recovery email on file, we've sent a reset link." }),
  { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
);

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendResetEmail(to: string, resetUrl: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "FitnessTalks Meal Tracker <onboarding@resend.dev>",
      to,
      subject: "Reset your Meal Tracker password",
      html: `
        <p>Someone (hopefully you) requested a password reset for your Meal Tracker account.</p>
        <p><a href="${resetUrl}">Click here to set a new password</a> — this link expires in 30 minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { username } = await req.json();
    if (!username || typeof username !== "string") return GENERIC_RESPONSE;

    const normalized = username.trim().toLowerCase();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, recovery_email")
      .eq("username", normalized)
      .maybeSingle();

    if (!profile || !profile.recovery_email) return GENERIC_RESPONSE;

    const rawToken = crypto.randomUUID() + crypto.randomUUID();
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("password_reset_tokens").insert({
      user_id: profile.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });
    if (insertError) throw insertError;

    const resetUrl = `${APP_URL}/?reset_token=${rawToken}`;
    await sendResetEmail(profile.recovery_email, resetUrl);

    return GENERIC_RESPONSE;
  } catch (e) {
    console.error(e);
    return GENERIC_RESPONSE;
  }
});
