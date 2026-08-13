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
                initialData.saison_id
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

        setSaisonChanteurs(
            data.saisonChanteurs
        );

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

        return saisonChanteurPupitres.some(
            scp =>
                scp.chanteur_id === chanteur.chanteur_id &&
                scp.pupitre_id === chansonPupitre.pupitre_id
        );
    };
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