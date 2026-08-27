import { useEffect, useState } from "react";
import RepartitionService from "../../services/RepartitionService";
import { ChansonpupitreRepository } from "../../repositories/ChansonpupitreRepository";
import { SaisonChanteurRepository } from "../../repositories/SaisonChanteurRepository";
import { SaisonChanteurPupitreRepository } from "../../repositories/SaisonChanteurPupitreRepository";
import DataTable from "../table/DataTable";


export default function FormRepartition({
    config,
    initialData,
    context,
    form,
    errors,
    onChange
}) {

    const repartitionService = new RepartitionService(
        new ChansonpupitreRepository("chanson_pupitres"),
        new SaisonChanteurRepository(),
        new SaisonChanteurPupitreRepository("saison_chanteur_pupitres")
    );
    const saisonConcertId = config.controller.context.saisonConcertId ?? false;
    const [chansonPupitres, setChansonPupitres] = useState([]);
    const [saisonChanteurs, setSaisonChanteurs] = useState([]);
    const [saisonChanteurPupitres, setSaisonChanteurPupitres] = useState([]);



    useEffect(() => {

        if (!initialData?.chansons?.id) {
            return;
        }

        if (!initialData?.saison_id) {
            return;
        }

        loadData();

    }, [
        initialData?.chansons?.id,
        initialData?.saison_id
    ]);

    const loadData = async () => {

        const response =
            await repartitionService.getRepartition(
                initialData.chansons.id,
                initialData.saison_id,
                saisonConcertId
            );

        if (!response.success) {

            console.error(
                "Erreur répartition :",
                response.message
            );

            return;
        }

        const data = response.data;

        setChansonPupitres(
            data.chansonPupitres
        );

        let chanteurs = data.saisonChanteurs || [];

        // En mode concert :
        // on ne garde que les chanteurs qui participent
        if (saisonConcertId) {

            const participations =
                data.saisonConcertChanteurs || [];

            chanteurs = chanteurs.filter(
                chanteur =>
                    participations.some(
                        participation =>
                            participation.saison_chanteur_id ===
                            chanteur.id &&
                            participation.participe === true
                    )
            );
        }

        setSaisonChanteurs(chanteurs);

        setSaisonChanteurPupitres(
            data.saisonChanteurPupitres
        );
    };

    /*
     * Vérifie si le chanteur possède
     * le pupitre correspondant à la colonne.
     */
    const isPupitreValide = (
        chanteur,
        chansonPupitre
    ) => {

        const chanteurId = chanteur.chanteur_id;
        const pupitreId = chansonPupitre.pupitre_id;
        const chansonId = initialData.chansons.id;

        // 1. Cherche un choix spécifique pour cette chanson
        const choixChanson = saisonChanteurPupitres.find(
            scp =>
                scp.saison_chanteurs?.chanteur_id === chanteurId &&
                scp.chanson_id === chansonId
        );


        // 2. Si un choix existe pour cette chanson,
        //    il est prioritaire
        if (choixChanson) {
            return choixChanson.pupitre_id === pupitreId;
        }

        // 3. Sinon, chercher le pupitre principal du chanteur
        const pupitrePrincipal = saisonChanteurPupitres.find(
            scp =>
                scp.saison_chanteurs?.chanteur_id === chanteurId &&
                scp.principal === true
        );

        // 4. Aucun choix chanson → utiliser le principal
        return (
            pupitrePrincipal?.pupitre_id === pupitreId
        );
    };


    const columns_old = [
        {
            field: "chanteur",
            header: "Chanteur",
            render: (_, row) => (
                <>
                    {row.chanteurs?.prenom} {row.chanteurs?.nom}
                </>
            ),
            sortValue: (row) =>
                `${row.chanteurs?.prenom ?? ""} ${row.chanteurs?.nom ?? ""}`
        },

        ...chansonPupitres.map((chansonPupitre) => ({
            field: `pupitre_${chansonPupitre.pupitre_id}`,
            header: chansonPupitre.pupitres?.nom,

            render: (_, row) => {
                const valide = isPupitreValide(
                    row,
                    chansonPupitre
                );

                return (
                    <input
                        type="checkbox"
                        checked={valide}
                        readOnly
                    />
                );
            },
            sortValue: (row) =>
                isPupitreValide(row, chansonPupitre) ? 1 : 0
        }))
    ];
    const columns = [
        {
            field: "chanteur",
            header: "Chanteur",

            render: (_, row) => (
                <>
                    {row.chanteurs?.prenom} {row.chanteurs?.nom}
                </>
            ),

            sortValue: (row) =>
                getNomChanteur(row)
        },

        ...chansonPupitres.map((chansonPupitre) => ({
            field: `pupitre_${chansonPupitre.pupitre_id}`,
            header: chansonPupitre.pupitres?.nom,

            render: (_, row) => {

                const valide =
                    isPupitreValide(
                        row,
                        chansonPupitre
                    );

                return (
                    <input
                        type="checkbox"
                        checked={valide}
                        readOnly
                    />
                );
            },

            sortValue: (row) =>
                getSortValuePupitre(
                    row,
                    chansonPupitre
                )
        }))
    ];
    
    const getNomChanteur = (row) =>
        `${row.chanteurs?.nom ?? ""} ${row.chanteurs?.prenom ?? ""}`;


    const getSortValuePupitre = (
        row,
        chansonPupitre
    ) => {

        const pupitreId =
            getPupitreEffectif(row);

        const nom =
            getNomChanteur(row);

        /*
         * Le pupitre cliqué en premier.
         * Puis les autres pupitres dans leur ordre.
         */

        const estPupitreSelectionne =
            pupitreId === chansonPupitre.pupitre_id;

        const ordrePupitre =
            estPupitreSelectionne
                ? "0"
                : "1";

        return `${ordrePupitre}_${pupitreId ?? "999"}_${nom}`;
    };

    const getPupitreEffectif = (row) => {

        const chanteurId = row.chanteur_id;
        const chansonId = initialData.chansons.id;

        // Priorité au pupitre spécifique à la chanson
        const choixChanson =
            saisonChanteurPupitres.find(
                scp =>
                    scp.saison_chanteurs?.chanteur_id ===
                    chanteurId &&
                    scp.chanson_id === chansonId
            );

        if (choixChanson) {
            return choixChanson.pupitre_id;
        }

        // Sinon pupitre principal
        const pupitrePrincipal =
            saisonChanteurPupitres.find(
                scp =>
                    scp.saison_chanteurs?.chanteur_id ===
                    chanteurId &&
                    scp.principal === true
            );

        return pupitrePrincipal?.pupitre_id ?? null;
    };

    return (
        <div>

            <h2>
                Répartition
            </h2>

            <div style={{ marginBottom: 15 }}>
                <strong>
                    Chanson : {initialData?.chansons?.titre}
                </strong>
            </div>
            <DataTable
                data={saisonChanteurs}
                config={{
                    columns
                }}
            />
            {/* 
            <div
                style={{
                    overflowX: "auto"
                }}
            >

                <table
                    style={{
                        width: "100%",
                        borderCollapse: "collapse"
                    }}
                >

                    <thead>

                        <tr>

                            <th
                                style={{
                                    border: "1px solid #ccc",
                                    padding: 8,
                                    textAlign: "left",
                                    background: "#f5f5f5",
                                    position: "sticky",
                                    left: 0
                                }}
                            >
                                Chanteur
                            </th>


                            {chansonPupitres.map(
                                chansonPupitre => (

                                    <th
                                        key={chansonPupitre.id}
                                        style={{
                                            border: "1px solid #ccc",
                                            padding: 8,
                                            textAlign: "center",
                                            background: "#f5f5f5"
                                        }}
                                    >
                                        {
                                            chansonPupitre
                                                .pupitres
                                                ?.nom
                                        }
                                    </th>

                                )
                            )}

                        </tr>

                    </thead>


                    <tbody>

                        {saisonChanteurs.map(
                            saisonChanteur => (

                                <tr
                                    key={saisonChanteur.id}
                                >

                                    <td
                                        style={{
                                            border: "1px solid #ccc",
                                            padding: 8,
                                            whiteSpace: "nowrap",
                                            position: "sticky",
                                            left: 0,
                                            background: "white"
                                        }}
                                    >
                                        {
                                            saisonChanteur
                                                .chanteurs
                                                ?.prenom
                                        }{" "}
                                        {
                                            saisonChanteur
                                                .chanteurs
                                                ?.nom
                                        }
                                    </td>


                                    {chansonPupitres.map(
                                        chansonPupitre => {

                                            const valide =
                                                isPupitreValide(
                                                    saisonChanteur,
                                                    chansonPupitre
                                                );


                                            return (
                                                <td
                                                    key={
                                                        chansonPupitre.id
                                                    }
                                                    style={{
                                                        border: "1px solid #ccc",
                                                        padding: 8,
                                                        textAlign: "center"
                                                    }}
                                                >

                                                    <input
                                                        type="checkbox"
                                                        checked={valide}
                                                        readOnly
                                                    />

                                                </td>
                                            );

                                        }
                                    )}

                                </tr>

                            )
                        )}

                    </tbody>

                </table>

            </div> */}

        </div>
    );
}