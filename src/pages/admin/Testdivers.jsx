
import FileUploader from "../../core/framework/FileUploader";
import TestStorage from "../../core/framework/TestStorage";
import NotificationService from "../../services/NotificationService";
import StorageService from "../../services/StorageService";


export default function Testdivers() {
  const testStorage = async () => {
    try {
      const file = new File(
        ["test droit à l'image"],
        "test.pdf",
        { type: "application/pdf" }
      );

      const result = await StorageService.upload(
        "referentiel-documents",
        "test/test.pdf",
        file
      );

      console.log("UPLOAD OK", result);

      const url = await StorageService.createSignedUrl(
        "referentiel-documents",
        "test/test.pdf",
        3600
      );

      console.log("URL SIGNED OK", url);

    } catch (error) {
      console.error("STORAGE ERROR", error);
    }
  };

  const testEdgeFunction = async () => {
    const token = localStorage.getItem("token");

    const response = await fetch(
      "https://lqgkxpvkauoaeqtbndoy.supabase.co/functions/v1/create-chanteur-droit-image-upload",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          token
        })
      }
    );

    const result = await response.json();

    console.log("EDGE FUNCTION", response.status, result);
  };
  const testEdgeFunction2 = async () => {
    const token = localStorage.getItem("token");

    const response = await fetch(
      "https://lqgkxpvkauoaeqtbndoy.supabase.co/functions/v1/get-chanteur-droit-image-template",
      {
        method: "POST",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: localStorage.getItem("token")
        })
      }
    );

    const result = await response.json();

    console.log("EDGE FUNCTION", response.status, result);
  };
  const testSignedUpload = async () => {
    try {
      const token = localStorage.getItem("token");

      // 1. Demande d'autorisation au chanteur
      const authorization =
        await StorageService.createChanteurDroitImageUpload(token);

      console.log(
        "SIGNED UPLOAD AUTH",
        authorization
      );

      // 2. Création d'un vrai fichier de test
      const file = new File(
        ["test"],
        "test.txt",
        {
          type: "text/plain"
        }
      );

      // 3. Upload avec le token signé
      const result =
        await StorageService.uploadToSignedUrl(
          "chanteur-documents",
          authorization.path,
          authorization.token,
          file
        );

      console.log(
        "SIGNED UPLOAD OK",
        result
      );

    } catch (error) {

      console.error(
        "SIGNED UPLOAD ERROR",
        error
      );
    }
  };

  const testRelances = async () => {
    try {
      const response = await fetch(
        "https://lqgkxpvkauoaeqtbndoy.supabase.co/functions/v1/relances",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({})
        }
      );

      const result = await response.json();

      console.log("RELANCES", response.status, result);

    } catch (error) {
      console.error("RELANCES ERROR", error);
    }
  };

  return (
    <div>

      <h1>test divers</h1>
<hr />

<button onClick={testRelances}>
  Tester Edge Function Relances
</button>
      <hr />
      <button onClick={testSignedUpload}>
        Tester upload signé
      </button>
      <hr />

      <button onClick={testEdgeFunction2}>
        Tester Edge Function 2

      </button>
      <hr />

      <button onClick={testEdgeFunction}>
        Tester Edge Function
      </button>
      <hr />
      <button
        onClick={() =>
          NotificationService.success(
            "Test de notification"
          )
        }
      >
        Tester notification
      </button>

      <hr />

      <FileUploader
        bucket="referentiel-documents"
      />
      <hr />


    </div>
  );
}