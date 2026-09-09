import React from "react";
import { Link } from "react-router-dom";

import "../../styles/home.css";
import PublicLayout from "../../layouts/PublicLayout";

export default function Home() {

    const nomAsso = import.meta.env.VITE_NOM_ASSO;

    return (
        <PublicLayout>

            {/* Présentation */}
            <section className="accueil-card">

                <h2>Bienvenue</h2>

                <p>
                    {nomAsso} dispose d'un espace numérique dédié
                    à la gestion de la vie de la chorale.
                </p>

                <p>
                    Cet espace permet aux chanteurs de retrouver
                    leurs informations et les événements de la saison.
                </p>


                <div className="accueil-features">

                    <div className="accueil-feature">
                        <div className="accueil-feature-icon">
                            ♪
                        </div>

                        <div>
                            <h3>Mon profil</h3>
                            <p>
                                Consulter et mettre à jour ses informations.
                            </p>
                        </div>
                    </div>


                    <div className="accueil-feature">
                        <div className="accueil-feature-icon">
                            ♫
                        </div>

                        <div>
                            <h3>Répétitions</h3>
                            <p>
                                Retrouver les dates et informations
                                concernant les répétitions.
                            </p>
                        </div>
                    </div>


                    <div className="accueil-feature">
                        <div className="accueil-feature-icon">
                            ★
                        </div>

                        <div>
                            <h3>Concerts</h3>
                            <p>
                                Consulter les concerts et indiquer
                                sa participation.
                            </p>
                        </div>
                    </div>


                    <div className="accueil-feature">
                        <div className="accueil-feature-icon">
                            ▣
                        </div>

                        <div>
                            <h3>Documents</h3>
                            <p>
                                Accéder aux informations et documents
                                utiles à la chorale.
                            </p>
                        </div>
                    </div>

                </div>

            </section>


            {/* Accès */}
            <section className="accueil-access">

                <h2>Accès chanteur</h2>

                <p>
                    L'accès à l'espace personnel est réservé
                    aux chanteurs de {nomAsso}.
                </p>

                <p className="accueil-access-info">
                    Un lien personnel est envoyé directement
                    à chaque chanteur.
                </p>

            </section>

        </PublicLayout>
    );
}