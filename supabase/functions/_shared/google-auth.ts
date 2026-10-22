/**
 * Authentification OAuth 2.0 Google partagee entre les Edge Functions.
 *
 * Par defaut, utilise les secrets Gmail deja configures.
 * Pour Drive, utiliser un refresh token distinct si le token Gmail
 * ne dispose pas des scopes Google Drive necessaires.
 *
 * N'expose jamais le refresh token, client_secret ou access_token dans les logs.
 */

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function obtenirAccessToken(
  refreshTokenSecret = "GMAIL_IEUVDE_REFRESH_TOKEN",
): Promise<string> {
  const clientId = Deno.env.get("GMAIL_IEUVDE_CLIENT_ID");
  const clientSecret = Deno.env.get("GMAIL_IEUVDE_CLIENT_SECRET");
  const refreshToken = Deno.env.get(refreshTokenSecret);

  const missing = [
    !clientId && "GMAIL_IEUVDE_CLIENT_ID",
    !clientSecret && "GMAIL_IEUVDE_CLIENT_SECRET",
    !refreshToken && refreshTokenSecret,
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Secret(s) Google manquant(s) : ${missing.join(", ")}`);
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken!,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    let googleError = "";
    try {
      const body = await response.json();
      if (typeof body.error === "string") googleError = ` (${body.error})`;
    } catch {
      // Pas de corps JSON exploitable.
    }

    throw new Error(
      `Renouvellement du token Google impossible (HTTP ${response.status})${googleError}`,
    );
  }

  const data = await response.json();
  if (typeof data.access_token !== "string" || !data.access_token) {
    throw new Error("Google n'a pas renvoye de jeton d'acces");
  }

  return data.access_token;
}
