import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

function encodeMimeHeader(value: string): string {
  const bytes = new TextEncoder().encode(value);

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}


/**
 * Vérifie si une relance peut être envoyée aujourd'hui.
 *
 * Recherche le dernier envoi pour :
 * - un chanteur
 * - un type de relance
 * - un contexte éventuel
 *
 * Retourne false si une relance a déjà été envoyée aujourd'hui.
 */
export async function peutRelancer(
  supabase: SupabaseClient,
  chanteurId: string,
  typeRelanceId: number,
  contexteType: string | null = null,
  contexteId: string | null = null
): Promise<boolean> {

  let query = supabase
    .from("relances_envois")
    .select("date_envoi")
    .eq("chanteur_id", chanteurId)
    .eq("type_relance_id", typeRelanceId)
    .order("date_envoi", { ascending: false })
    .limit(1);

  console.log(
    `peutRelancer : ${chanteurId} ${typeRelanceId}`
  );


  if (contexteType === null) {
    query = query.is("contexte_type", null);
  } else {
    query = query.eq("contexte_type", contexteType);
  }

  if (contexteId === null) {
    query = query.is("contexte_id", null);
  } else {
    query = query.eq("contexte_id", contexteId);
  }


  const { data, error } = await query;


  console.log(
    "peutRelancer RESULTAT :",
    JSON.stringify({
      chanteurId,
      typeRelanceId,
      contexteType,
      contexteId,
      data,
    })
  );


  if (error) {
    throw error;
  }


  if (!data || data.length === 0) {
    return true;
  }


  const dateEnvoi = data[0].date_envoi;


  console.log(
    `peutRelancer  dateEnvoi: ${dateEnvoi} `
  );


  if (dateEnvoi === null) {
    return true;
  }


  const aujourdHui = new Date();
  const dernierEnvoi = new Date(dateEnvoi);

  const dateAujourdhui =
    aujourdHui.toISOString().slice(0, 10);

  const dateDernierEnvoi =
    dernierEnvoi.toISOString().slice(0, 10);


  console.log(
    `peutRelancer  dateAujourdhui: ${dateAujourdhui} `
  );

  console.log(
    `peutRelancer  dateDernierEnvoi: ${dateDernierEnvoi} `
  );


  if (dateDernierEnvoi === dateAujourdhui) {

    console.log(
      "peutRelancer COMPARAISON :",
      JSON.stringify({
        dateEnvoi,
        dateDernierEnvoi,
        dateAujourdhui,
        memeJour:
          dateDernierEnvoi === dateAujourdhui,
      })
    );

    return false;
  }


  return dateDernierEnvoi < dateAujourdhui;
}


/**
 * Enregistre une relance après une tentative d'envoi.
 *
 * resultatEnvoi :
 * - SUCCES
 * - ERREUR
 *
 * messageId :
 * - ID Gmail si l'envoi a réussi
 *
 * erreur :
 * - message d'erreur si l'envoi a échoué
 */
export async function enregistrerRelance(
  supabase: SupabaseClient,
  chanteurId: string,
  typeRelanceId: number,
  contexteType: string | null = null,
  contexteId: string | null = null,
  resultatEnvoi: string | null = null,
  messageId: string | null = null,
  erreur: string | null = null
) {

  const { data, error } = await supabase
    .from("relances_envois")
    .insert({
      chanteur_id: chanteurId,
      type_relance_id: typeRelanceId,
      contexte_type: contexteType,
      contexte_id: contexteId,
      date_envoi: new Date().toISOString(),

      resultat_envoi: resultatEnvoi,
      message_id: messageId,
      erreur: erreur,
    })
    .select()
    .single();


  if (error) {
    throw error;
  }


  return data;
}


// ============================================================
// Gmail : envoyer un mail via OAuth2
// ============================================================

type MailRelance = {
  to: string;
  subject: string;
  text: string;
};


function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value);

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}


async function obtenirAccessToken(): Promise<string> {

  const clientId =
    Deno.env.get("GMAIL_IEUVDE_CLIENT_ID");

  const clientSecret =
    Deno.env.get("GMAIL_IEUVDE_CLIENT_SECRET");

  const refreshToken =
    Deno.env.get("GMAIL_IEUVDE_REFRESH_TOKEN");


  if (!clientId || !clientSecret || !refreshToken) {

    throw new Error(
      "Secrets Gmail manquants : GMAIL_IEUVDE_CLIENT_ID, GMAIL_IEUVDE_CLIENT_SECRET ou GMAIL_IEUVDE_REFRESH_TOKEN"
    );
  }


  const response = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },

      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    }
  );


  const data = await response.json();


  if (!response.ok) {

    console.error(
      "Erreur récupération access token :",
      data
    );

    throw new Error(
      data.error_description ||
      "Impossible d'obtenir l'access token Gmail"
    );
  }


  return data.access_token;
}


export async function envoyerMailRelance_OLD({
  to,
  subject,
  text,
}: MailRelance) {

  // 1. Obtenir un access_token valide

  const accessToken =
    await obtenirAccessToken();


  // 2. Construire le mail MIME

  const mimeMessage = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "MIME-Version: 1.0",
    "",
    text,
  ].join("\r\n");


  // 3. Encoder en base64url pour Gmail

  const raw =
    base64UrlEncode(mimeMessage);


  // 4. Envoyer via Gmail API

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${accessToken}`,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        raw,
      }),
    }
  );


  const data = await response.json();


  if (!response.ok) {

    console.error(
      "Erreur Gmail :",
      data
    );

    throw new Error(
      data.error?.message ||
      "Erreur lors de l'envoi du mail Gmail"
    );
  }


  console.log(
    "Mail Gmail envoyé :",
    data.id
  );


  return {
    success: true,
    messageId: data.id,
  };
}


export async function envoyerMailRelance({
  to,
  subject,
  text,
}: MailRelance) {

  if (!to || !to.trim()) {
    throw new Error(
      "Adresse email destinataire absente"
    );
  }


  const destinataire = to.trim();


  console.log(
    "DESTINATAIRE GMAIL :",
    JSON.stringify(to)
  );

  console.log(
    "DESTINATAIRE GMAIL :",
    JSON.stringify(destinataire)
  );


  // 1. Obtenir un access_token valide

  const accessToken =
    await obtenirAccessToken();


  // --------------------------------------------------
  // 2. Récupérer la signature Gmail du compte
  // --------------------------------------------------

  const signatureResponse = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs",
    {
      method: "GET",

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    }
  );


  const signatureData =
    await signatureResponse.json();


  if (!signatureResponse.ok) {

    console.error(
      "Erreur récupération signature Gmail :",
      signatureData
    );

    throw new Error(
      signatureData.error?.message ||
      "Impossible de récupérer la signature Gmail"
    );
  }


  // --------------------------------------------------
  // 3. Trouver l'adresse d'envoi principale
  // --------------------------------------------------

  const sendAs =
    signatureData.sendAs?.find(
      (item: any) =>
        item.isPrimary === true
    );


  const signature =
    sendAs?.signature ?? "";


  console.log(
    "Signature Gmail récupérée :",
    signature ? "OUI" : "NON"
  );


  // --------------------------------------------------
  // 4. Transformer le texte du mail en HTML
  // --------------------------------------------------

  const textHtml = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n/g, "<br>");


  // --------------------------------------------------
  // 5. Ajouter la signature Gmail
  // --------------------------------------------------

  const html = signature
    ? `${textHtml}<br><br>${signature}`
    : textHtml;


  // --------------------------------------------------
  // 6. Construire le mail MIME HTML
  // --------------------------------------------------

  const mimeMessage = [
    `To: ${destinataire}`,
    `Subject: =?UTF-8?B?${encodeMimeHeader(subject)}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
  ].join("\r\n");


  // --------------------------------------------------
  // 7. Encoder en base64url
  // --------------------------------------------------

  const raw =
    base64UrlEncode(mimeMessage);


  // --------------------------------------------------
  // 8. Envoyer via Gmail API
  // --------------------------------------------------

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${accessToken}`,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        raw,
      }),
    }
  );


  const data =
    await response.json();


  if (!response.ok) {

    console.error(
      "Erreur Gmail :",
      data
    );

    throw new Error(
      data.error?.message ||
      "Erreur lors de l'envoi du mail Gmail"
    );
  }


  console.log(
    "Mail Gmail envoyé :",
    data.id
  );


  return {
    success: true,
    messageId: data.id,
  };
}