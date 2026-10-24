import { getCouleurGroupe } from "../../helper/helper";
import SrcPhoto from "./SrcPhoto";
import "../AvatarChanteur.css";
import { initialesPhoto } from "./photoUtils";

/** Présentation des cartes du trombinoscope, sans accès aux données. */
export default function AffichePhotoTrombi({ personne, afficherGroupe = true }) {
    const groupeNom = personne.groupe_nom || "Groupe non défini";
    const couleur = personne.groupe_id || personne.groupe_nom
        ? getCouleurGroupe(personne.groupe_id, personne.groupe_nom) || "#64748b"
        : "#64748b";
    const nomComplet = [personne.prenom, personne.nom].filter(Boolean).join(" ");
    const initiales = initialesPhoto(personne.prenom, personne.nom);

    return (
        <article
            className={`trombi-personne${afficherGroupe ? "" : " trombi-personne--groupe-selectionne"}`}
            style={{ "--trombi-couleur-groupe": couleur }}
        >
            <div className="trombi-personne-photo">
                {/* On garde les classes CSS existantes de l'ancien AvatarChanteur. */}
                <div
                    className="chanteur-avatar"
                    style={{ "--chanteur-avatar-size": "88px" }}
                    role="img"
                    aria-label={`Photo de ${nomComplet}`}
                >
                    <SrcPhoto
                        url={personne.photo_url}
                        alt=""
                        fallback={initiales}
                        failedFallback={initiales}
                        imageClassName="chanteur-avatar__image"
                        fallbackClassName="chanteur-avatar__fallback"
                    />
                </div>
            </div>
            <div className="trombi-personne-identite" title={nomComplet}>
                <span className="trombi-personne-prenom">{personne.prenom}</span>
                <strong className="trombi-personne-nom">{personne.nom}</strong>
            </div>
            {afficherGroupe && (
                <span className="trombi-personne-groupe" title={groupeNom}>
                    <span className="trombi-personne-point" aria-hidden="true" />
                    {groupeNom}
                </span>
            )}
        </article>
    );
}
