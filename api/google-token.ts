// Vercel Function: google-token
//
// A stateless relay between the browser and Google's OAuth token endpoint.
// It exists only because Google's client *secret* must never reach the
// browser. It keeps no state: the refresh_token it returns is stored by the
// browser itself, and later sent back here to mint a fresh access_token.
//
// Environment (Vercel project settings; the secret is never a VITE_ var):
//   GOOGLE_CLIENT_ID      same value as VITE_GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET  from the same OAuth client

type TokenRequest =
  | { grant_type: "authorization_code"; code: string; redirect_uri: string }
  | { grant_type: "refresh_token"; refresh_token: string };

// The website calls this same-origin; the Android and iOS apps call it
// from their web view's own origin, so those two get CORS headers.
const APP_ORIGINS = new Set(["https://localhost", "capacitor://localhost"]);
function json(body: unknown, status: number, corsOrigin: string | null): Response {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (corsOrigin) Object.assign(headers, corsHeaders(corsOrigin));
  return new Response(JSON.stringify(body), { status, headers });
}

function corsHeaders(origin: string): Record<string, string> {
  return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type", Vary: "Origin" };
}

export function OPTIONS(req: Request): Response {
  const origin = req.headers.get("origin") ?? "";
  return new Response(null, { status: 204, headers: APP_ORIGINS.has(origin) ? corsHeaders(origin) : {} });
}

function isValidRequest(body: unknown): body is TokenRequest {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (b.grant_type === "authorization_code") return typeof b.code === "string" && typeof b.redirect_uri === "string";
  if (b.grant_type === "refresh_token") return typeof b.refresh_token === "string";
  return false;
}

export async function POST(req: Request): Promise<Response> {
  const origin = req.headers.get("origin") ?? "";
  const cors = APP_ORIGINS.has(origin) ? origin : null;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return json({ error: "server_misconfigured", message: "GOOGLE_CLIENT_ID/SECRET not set" }, 500, cors);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400, cors);
  }
  if (!isValidRequest(body)) return json({ error: "invalid_request" }, 400, cors);

  const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret });
  if (body.grant_type === "authorization_code") {
    params.set("grant_type", "authorization_code");
    params.set("code", body.code);
    params.set("redirect_uri", body.redirect_uri);
  } else {
    params.set("grant_type", "refresh_token");
    params.set("refresh_token", body.refresh_token);
  }

  const googleRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = await googleRes.json();

  // Google's {error, error_description} is safe to pass through; it never
  // includes the secret.
  if (!googleRes.ok) return json(data, googleRes.status, cors);

  // A refresh grant doesn't return a new refresh_token; the caller keeps
  // reusing the original one.
  return json({
    access_token: data.access_token,
    expires_in: data.expires_in,
    refresh_token: data.refresh_token,
    scope: data.scope,
  }, 200, cors);
}
