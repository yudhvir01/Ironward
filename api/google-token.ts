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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function isValidRequest(body: unknown): body is TokenRequest {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (b.grant_type === "authorization_code") return typeof b.code === "string" && typeof b.redirect_uri === "string";
  if (b.grant_type === "refresh_token") return typeof b.refresh_token === "string";
  return false;
}

export async function POST(req: Request): Promise<Response> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return json({ error: "server_misconfigured", message: "GOOGLE_CLIENT_ID/SECRET not set" }, 500);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!isValidRequest(body)) return json({ error: "invalid_request" }, 400);

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
  if (!googleRes.ok) return json(data, googleRes.status);

  // A refresh grant doesn't return a new refresh_token; the caller keeps
  // reusing the original one.
  return json({
    access_token: data.access_token,
    expires_in: data.expires_in,
    refresh_token: data.refresh_token,
    scope: data.scope,
  });
}
