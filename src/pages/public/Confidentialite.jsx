import React from "react";

import "../../styles/legal.css";
import PublicLayout from "../../layouts/PublicLayout";

export default function Confidentialite() {

    const nomAsso = import.meta.env.VITE_NOM_ASSO;

    return (
        <PublicLayout>

            <section className="legal-card">

                <h2>Politique de confidentialité</h2>

                <h3>À quoi sert cette page ?</h3>

                <p>
                    Cette page présente la manière dont {nomAsso} utilise,
                    protège et conserve les informations personnelles
                    nécessaires au fonctionnement de son espace numérique.
                </p>

                <p>
                    Elle permet à chaque chanteur de comprendre quelles
                    informations peuvent être utilisées, pourquoi elles
                    sont nécessaires et quels sont ses droits concernant
                    ses données personnelles.
                </p>


                <h3>Les informations utilisées</h3>

                <p>
                    Le fonctionnement de l'espace numérique peut nécessiter
                    certaines informations concernant les chanteurs, notamment
                    leur nom, prénom, adresse e-mail, numéro de téléphone,
                    informations relatives à leur participation à la chorale
                    ou informations nécessaires à l'organisation des activités.
                </p>


                <h3>Pourquoi ces informations sont-elles utilisées ?</h3>

                <ul>
                    <li>Gérer les membres et leur profil.</li>
                    <li>Organiser les saisons de la chorale.</li>
                    <li>Communiquer les informations relatives aux répétitions et concerts.</li>
                    <li>Gérer les participations aux événements.</li>
                    <li>Mettre à disposition les documents utiles.</li>
                    <li>Envoyer les communications nécessaires à la vie de la chorale.</li>
                </ul>


                <h3>Accès à l'espace personnel</h3>

                <p>
                    L'accès à l'espace personnel est réalisé au moyen
                    d'un lien personnel transmis par {nomAsso}.
                </p>

                <p>
                    Ce lien permet au chanteur d'accéder aux informations
                    correspondant à son profil sans avoir à utiliser un
                    mot de passe classique.
                </p>

                <p>
                    Ce lien étant personnel, il ne doit pas être transmis
                    à une autre personne.
                </p>


                <h3>Protection des données</h3>

                <p>
                    {nomAsso} met en œuvre des mesures destinées à protéger
                    les informations enregistrées dans l'espace numérique
                    contre les accès non autorisés, la perte ou l'utilisation
                    inappropriée.
                </p>


                <h3>Vos droits</h3>

                <p>
                    Conformément à la réglementation applicable en matière
                    de protection des données personnelles, chaque personne
                    dispose notamment de droits concernant ses données,
                    tels que le droit d'accès et de rectification et,
                    lorsque les conditions sont réunies, d'effacement
                    ou de limitation du traitement.
                </p>

                <p>
                    Pour toute question concernant vos données personnelles,
                    vous pouvez contacter directement {nomAsso}.
                </p>


                <p className="legal-date">
                    Dernière mise à jour : septembre 2026
                </p>

            </section>

        </PublicLayout>
    );
}