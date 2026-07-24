import { useState } from "react";
import { updateEtatSaisonChanteur } from "../../core/supabase/saisonChanteur.api";
export default function InscriptionChanteur() {

    const data = JSON.parse(
        localStorage.getItem("chanteur")
    );

    const chanteur = data.chanteur.chanteurs;

    const [telephone, setTelephone] = useState(
        chanteur.telephone || ""
    );


    async function valider() {

        const result = await updateEtatSaisonChanteur(
            data.chanteur.id,
            3
        );

        console.log(
            "Inscription envoyée",
            result
        );
    }


    return (
        <div>

            <h1>
                Inscription saison {data.chanteur.saisons.nom}
            </h1>


            <p>
                Bonjour {chanteur.prenom} {chanteur.nom}
            </p>


            <label>
                Téléphone
            </label>

            <input
                value={telephone}
                onChange={(e)=>setTelephone(e.target.value)}
            />


            <br />

            <button onClick={valider}>
                Envoyer mon inscription
            </button>

        </div>
    );
}