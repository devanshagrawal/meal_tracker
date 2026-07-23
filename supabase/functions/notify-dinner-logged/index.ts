// Supabase Edge Function, triggered by a Database Webhook on the day_logs
// table (INSERT + UPDATE). Detects the specific moment dinner transitions
// from "not logged" to "logged", then pushes an FCM notification to every
// registered Android device for that user.
//
// Required secrets (set via `supabase secrets set` or the Dashboard):
//   FCM_PROJECT_ID    - Firebase project ID
//   FCM_CLIENT_EMAIL  - service account client_email
//   FCM_PRIVATE_KEY   - service account private_key (PEM, \n-escaped is fine)
//
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase.

import { createClient } from "jsr:@supabase/supabase-js@2";

const FCM_PROJECT_ID = Deno.env.get("FCM_PROJECT_ID")!;
const FCM_CLIENT_EMAIL = Deno.env.get("FCM_CLIENT_EMAIL")!;
const FCM_PRIVATE_KEY = Deno.env.get("FCM_PRIVATE_KEY")!.replace(/\\n/g, "\n");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: FCM_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;

  const pemBody = FCM_PRIVATE_KEY
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function sendFcm(accessToken: string, token: string, title: string, body: string) {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          android: { priority: "high" },
        },
      }),
    }
  );
  const data = await res.json();
  return { ok: res.ok, data };
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();

    if (payload.table !== "day_logs") {
      return new Response("ignored: wrong table", { status: 200 });
    }

    const newDinner = payload.record?.meals?.dinner?.selection;
    const oldDinner = payload.old_record?.meals?.dinner?.selection;
    const dinnerJustLogged = Boolean(newDinner) && !oldDinner;

    if (!dinnerJustLogged) {
      return new Response("ignored: dinner not newly logged", { status: 200 });
    }

    const userId = payload.record.user_id;
    const { data: tokens, error } = await supabase
      .from("push_tokens")
      .select("id, token")
      .eq("user_id", userId);

    if (error) throw error;
    if (!tokens || tokens.length === 0) {
      return new Response("no push tokens for user", { status: 200 });
    }

    const accessToken = await getAccessToken();
    const staleTokenIds: string[] = [];

    for (const row of tokens) {
      const { ok, data } = await sendFcm(
        accessToken,
        row.token,
        "Dinner logged! 🌙",
        "Get your morning routine ready for tomorrow — jeera water, almonds & walnuts."
      );
      if (!ok && (data?.error?.status === "UNREGISTERED" || data?.error?.status === "NOT_FOUND")) {
        staleTokenIds.push(row.id);
      }
    }

    if (staleTokenIds.length > 0) {
      await supabase.from("push_tokens").delete().in("id", staleTokenIds);
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500 });
  }
});
