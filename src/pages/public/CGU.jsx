import React from "react";

import "../../styles/legal.css";
import PublicLayout from "../../layouts/PublicLayout";

export default function CGU() {

    const nomAsso = import.meta.env.VITE_NOM_ASSO;

    return (
        <PublicLayout>

            <section className="legal-card">

                <h2>Conditions générales d'utilisation</h2>

                <h3>À quoi servent ces conditions ?</h3>

                <p>
                    Les présentes conditions générales d'utilisation
                    définissent les règles applicables à l'utilisation
                    de l'espace numérique proposé par {nomAsso}.
                </p>

                <p>
                    Cet espace est destiné à faciliter la gestion de la vie
                    de la chorale et à permettre aux chanteurs d'accéder
                    simplement aux informations qui les concernent.
                </p>


                <h3>Objet de l'espace numérique</h3>

                <p>
                    L'espace numérique permet notamment aux chanteurs de :
                </p>

                <ul>
                    <li>consulter leurs informations personnelles ;</li>
                    <li>accéder aux informations relatives à la saison ;</li>
                    <li>consulter les répétitions et les rendez-vous ;</li>
                    <li>consulter les concerts et leur organisation ;</li>
                    <li>indiquer leur participation à certains événements ;</li>
                    <li>accéder aux chansons, documents et ressources mis à disposition.</li>
                </ul>


                <h3>Accès personnel</h3>

                <p>
                    L'accès à certaines fonctionnalités est réservé
                    aux chanteurs identifiés par {nomAsso}.
                </p>

                <p>
                    Chaque utilisateur est responsable de la confidentialité
                    de son lien d'accès et doit éviter de le transmettre
                    à une autre personne.
                </p>


                <h3>Utilisation de l'espace</h3>

                <p>
                    L'utilisateur s'engage à utiliser l'espace numérique
                    uniquement dans le cadre des activités de la chorale
                    et conformément à sa destination.
                </p>

                <p>
                    Il s'engage notamment à ne pas tenter d'accéder aux
                    informations d'un autre utilisateur, à ne pas contourner
                    les dispositifs de sécurité et à ne pas utiliser
                    les fonctionnalités du site à des fins étrangères
                    à leur objet.
                </p>


                <h3>Documents et contenus</h3>

                <p>
                    Les chansons, documents, fichiers et autres contenus
                    accessibles dans l'espace numérique sont mis à disposition
                    dans le cadre des activités de la chorale.
                </p>

                <p>
                    Ils ne doivent pas être diffusés publiquement ou transmis
                    à des personnes extérieures lorsque leur accès est réservé
                    aux membres de la chorale.
                </p>


                <h3>Disponibilité du service</h3>

                <p>
                    {nomAsso} s'efforce de maintenir l'espace numérique
                    disponible et fonctionnel.
                </p>

                <p>
                    Le service peut toutefois être temporairement interrompu,
                    notamment pour des raisons de maintenance, de mise à jour,
                    de sécurité ou en cas de problème technique.
                </p>


                <h3>Évolution de l'application</h3>

                <p>
                    Les fonctionnalités de l'espace numérique peuvent évoluer
                    afin de répondre aux besoins de la chorale, d'améliorer
                    son fonctionnement ou de renforcer sa sécurité.
                </p>


                <h3>Acceptation des conditions</h3>

                <p>
                    L'utilisation de l'espace numérique implique la prise
                    de connaissance et l'acceptation des présentes conditions
                    générales d'utilisation.
                </p>


                <p className="legal-date">
                    Dernière mise à jour : septembre 2026
                </p>

            </section>

        </PublicLayout>
    );
}