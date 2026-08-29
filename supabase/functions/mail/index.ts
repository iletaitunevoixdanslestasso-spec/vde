import { envoyerMailRelance } from "../relances/relance-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

Deno.serve(async (req) => {

  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {

    const { email, url, prenom } = await req.json();

    if (!email) {
      throw new Error("Email manquant");
    }

    if (!url) {
      throw new Error("URL manquante");
    }

    const subject = "Ton accès à l'espace chanteur";

    const text = [
      `Bonjour ${prenom ?? ""},`,
      "",
      "Voici ton lien d'accès à ton espace chanteur :",
      "",
      `👉 ${url}`,
      "",
      "À très vite !",
    ].join("\n");

    console.log("ENVOI INVITATION :", email);
    console.log("LIEN :", url);

    const resultat = await envoyerMailRelance({
      to: email,
      subject,
      text,
    });

    return new Response(
      JSON.stringify({
        success: true,
        messageId: resultat.messageId,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {

    console.error("ERREUR ENVOI INVITATION :", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});