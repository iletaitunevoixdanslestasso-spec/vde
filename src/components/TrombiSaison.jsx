import { useEffect, useMemo, useState } from "react";
import { getCouleurGroupe } from "../helper/helper";
import AvatarChanteur from "../components/AvatarChanteur";
// import AvatarChanteurSvg from "./AvatarChanteurSvg";
import "../styles/espaceChanteur_trombinoscope.css";
import TrombinoscopeService from "../services/TrombinoscopeService";
import AvatarChanteurSvg from "./AvatarChanteurSvg";

const collator = new Intl.Collator("fr", {
    sensitivity: "base",
    ignorePunctuation: true
});

function compareChanteurs(a, b) {
    return collator.compare(a.nom || "", b.nom || "") ||
        collator.compare(a.prenom || "", b.prenom || "");
}

function groupeCouleur(groupeId, groupeNom) {
    if (!groupeId && !groupeNom) return "#64748b";
    return getCouleurGroupe(groupeId, groupeNom) || "#64748b";
}

function afficherInitiales(prenom, nom) {
    return `${(prenom || "").trim().charAt(0)}${(nom || "").trim().charAt(0)}`
        .toLocaleUpperCase("fr") || "👤";
}

function PhotoEntouree({ personne, afficherGroupe = true }) {
    const groupeNom = personne.groupe_nom || "Groupe non défini";
    const couleur = groupeCouleur(personne.groupe_id, personne.groupe_nom);

    return (
        <article
            className={`trombi-personne${afficherGroupe ? "" : " trombi-personne--groupe-selectionne"}`}
            style={{ "--trombi-couleur-groupe": couleur }}
        >
            <div className="trombi-personne-photo">
                <AvatarChanteur
                    photoUrl={personne.photo_url ?? null}
                    size={88}
                    fallback={afficherInitiales(personne.prenom, personne.nom)}
                    alt={`Photo de ${personne.prenom || ""} ${personne.nom || ""}`.trim()}
                />
            </div>
            <div className="trombi-personne-identite" title={`${personne.prenom || ""} ${personne.nom || ""}`}>
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

function BlocInvite({ titre, personne, imageUrl, optionnel = false }) {
    const nom = [personne?.prenom, personne?.nom].filter(Boolean).join(" ");
    const url = imageUrl || personne?.photo_url || null;
    return (
        <div className="trombi-invite">
            <div className="trombi-invite-visuel">
                {optionnel && !url ? (
                    <div className="trombi-invite-vide" aria-label="Image facultative non renseignée">
                        <span className="icon icon-image" aria-hidden="true" />
                    </div>
                ) : (
                    <AvatarChanteur
                        photoUrl={url}
                        size={88}
                        fallback={afficherInitiales(personne?.prenom, personne?.nom)}
                        alt={nom ? `Photo de ${nom}` : titre}
                    />
                )}
            </div>
            <div className="trombi-invite-texte">
                <span className="trombi-invite-fonction">{titre}</span>
                {nom && <strong className="trombi-invite-nom">{nom}</strong>}
                {optionnel && !url && <span className="trombi-invite-option">Image à définir</span>}
            </div>
        </div>
    );
}

export default function TrombiSaison({ saisonId }) {
    // Ce composant ne connaît ni le token, ni le chanteur, ni l'espace appelant.

    const [donnees, setDonnees] = useState(null);
    const [chargement, setChargement] = useState(true);
    const [erreur, setErreur] = useState("");
    const [rafraichissement, setRafraichissement] = useState(0);
    const [affichage, setAffichage] = useState("alphabetique");
    const [groupeId, setGroupeId] = useState("tous");

    useEffect(() => {
        let actif = true;
        async function charger() {
            setChargement(true);
            setErreur("");
            try {
                const reponse = await TrombinoscopeService.getBySaisonId(saisonId);
                if (actif) setDonnees(reponse);
            } catch (e) {
                if (actif) {
                    setDonnees(null);
                    setErreur(e.message || "Impossible de charger le trombinoscope.");
                }
            } finally {
                if (actif) setChargement(false);
            }
        }
        charger();
        return () => { actif = false; };
    }, [saisonId, rafraichissement]);

    const chanteurs = useMemo(
        () => [...(donnees?.chanteurs || [])].sort(compareChanteurs),
        [donnees]
    );

    const groupes = useMemo(() => {
        const groupesParId = new Map();
        for (const g of donnees?.groupes || []) {
            if (g?.id) groupesParId.set(g.id, g);
        }
        for (const c of chanteurs) {
            if (c.groupe_id && !groupesParId.has(c.groupe_id)) {
                groupesParId.set(c.groupe_id, {
                    id: c.groupe_id,
                    nom: c.groupe_nom || "Groupe sans nom",
                    description: c.groupe_description || ""
                });
            }
        }
        return [...groupesParId.values()].sort((a, b) =>
            collator.compare(a.nom || "", b.nom || "")
        );
    }, [donnees, chanteurs]);

    const groupeChoisi = groupes.find(g => g.id === groupeId);
    const visibles = useMemo(() => (
        groupeId === "tous"
            ? chanteurs
            : chanteurs.filter(c => c.groupe_id === groupeId)
    ), [chanteurs, groupeId]);

    const sections = useMemo(() => {
        if (affichage === "alphabetique" || groupeId !== "tous") {
            return [{ id: "tous", groupe: groupeChoisi || null, membres: visibles }];
        }
        const sectionsGroupes = groupes.map(g => ({
            id: g.id,
            groupe: g,
            membres: visibles.filter(c => c.groupe_id === g.id)
        })).filter(s => s.membres.length > 0);
        const sansGroupe = visibles.filter(c => !c.groupe_id);
        if (sansGroupe.length) {
            sectionsGroupes.push({ id: "sans-groupe", groupe: null, membres: sansGroupe });
        }
        return sectionsGroupes;
    }, [affichage, groupeId, groupeChoisi, groupes, visibles]);

    const saisonNom = donnees?.saison?.nom || "Saison";
    const chefContexte = donnees?.chef || null;
    const photoChefDansListe = chanteurs.find(c => c.id === chefContexte?.id)?.photo_url;
    const chef = chefContexte && {
        ...chefContexte,
        photo_url: chefContexte.photo_url || photoChefDansListe || null
    };
    const accompagnantContexte = donnees?.accompagnant || null;
    const photoAccompagnantDansListe = chanteurs.find(c => c.id === accompagnantContexte?.id)?.photo_url;
    const accompagnant = accompagnantContexte && {
        ...accompagnantContexte,
        photo_url: accompagnantContexte.photo_url || photoAccompagnantDansListe || null
    };
    const descriptionGroupe = groupeChoisi?.description || "";

    if (chargement) {
        return <main className="trombinoscope-page"><div className="trombi-etat">Chargement du trombinoscope…</div></main>;
    }

    if (erreur) {
        return (
            <main className="trombinoscope-page">
                <div className="trombi-etat trombi-erreur" role="alert">
                    <p>{erreur}</p>
                    <button type="button" onClick={() => setRafraichissement(n => n + 1)}>Réessayer</button>
                </div>
            </main>
        );
    }

    return (
        <main className="trombinoscope-page">
            <div className="trombinoscope-feuille">
                <header className="trombi-entete">
                    <BlocInvite titre="Chef de chœur" personne={chef} />
                    <div className="trombi-identite-chorale">
                        <img
                            className="trombi-logo"
                            src="/logoVDE2.png"
                            alt="Logo Il était une voix dans l'Est"
                        />
                        <div className="trombi-identite-saison">
                            <h1><span>{saisonNom}</span></h1>
                            <p>{groupeChoisi
                                ? `Groupe ${descriptionGroupe || groupeChoisi.nom}`
                                : "Tous les groupes"}</p>
                        </div>
                    </div>
                    <BlocInvite
                        titre="Accompagnant"
                        personne={accompagnant}
                        optionnel
                    />
                </header>

                <div className="trombi-barre-outils">
                    <div className="trombi-filtres">
                        <label>
                            Présentation
                            <select value={affichage} onChange={e => setAffichage(e.target.value)}>
                                <option value="alphabetique">Tous par ordre alphabétique</option>
                                <option value="groupes">Regrouper par groupe</option>
                            </select>
                        </label>
                        <label>
                            Groupe
                            <select value={groupeId} onChange={e => setGroupeId(e.target.value)}>
                                <option value="tous">Tous les groupes</option>
                                {groupes.map(g => (
                                    <option key={g.id} value={g.id}>
                                        {g.nom}{g.description ? ` — ${g.description}` : ""}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <div className="trombi-actions">
                        <span className="trombi-compteur">
                            {visibles.length} choriste{visibles.length > 1 ? "s" : ""}
                        </span>
                        <button
                            type="button"
                            className="trombi-imprimer"
                            onClick={() => window.print()}
                        >
                            Imprimer
                        </button>
                    </div>
                </div>

                {!visibles.length ? (
                    <p className="trombi-aucun">Aucun choriste à afficher.</p>
                ) : (
                    <div className="trombi-sections">
                        {sections.map(section => (
                            <section key={section.id} className="trombi-section">
                                {affichage === "groupes" && groupeId === "tous" && (
                                    <h2 className="trombi-section-titre" style={{
                                        "--trombi-couleur-groupe": groupeCouleur(section.groupe?.id, section.groupe?.nom)
                                    }}>
                                        <span className="trombi-section-indicateur" />
                                        {section.groupe?.nom || "Sans groupe"}
                                        {section.groupe?.description && <small>{section.groupe.description}</small>}
                                        <span className="trombi-section-effectif">{section.membres.length}</span>
                                    </h2>
                                )}
                                <div className="trombi-grille">
                                    {section.membres.map(c => (
                                        <PhotoEntouree key={c.id} personne={c} afficherGroupe={groupeId === "tous"} />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
