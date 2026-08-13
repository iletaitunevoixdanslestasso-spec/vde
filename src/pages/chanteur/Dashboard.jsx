import { Link } from "react-router-dom";
import { useChorale } from "../../core/hooks/useChorale";
import { updateEtatSaisonChanteur } from "../../core/supabase/saisonChanteur.api";

export default function DashboardChanteur() {
  // const { chanteur } = useChorale();
  const data = JSON.parse(localStorage.getItem("chanteur")); // stoke par TokenGuard
  const chanteur = data?.chanteur?.chanteurs;

  async function accepterInscription() {

    const data = JSON.parse(
      localStorage.getItem("chanteur")
    );

    const result = await updateEtatSaisonChanteur(
      data.chanteur.id,
      3
    );

    console.log("nouvel état", result);
  }

  return (
    <div>
      <h1>🎼 Bonjour {chanteur?.prenom}</h1>

      <p>Bienvenue dans votre espace chorale</p>

      <ul>
        <li>
          <Link to="chansons">
            🎵 Mes chansons
          </Link></li>
        <li>🎤 Concerts</li>
        <li>🗓️ Répétitions</li>
        <li>🗳️ Votes</li>
        <li>
          <Link to="inscription">
            Compléter mon inscription
          </Link>
        </li>
      </ul>
    </div>
  );
}