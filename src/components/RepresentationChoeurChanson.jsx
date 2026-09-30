import {
    useEffect,
    useState
} from "react";

import RepresentationChoeur
    from "./RepresentationChoeur";

import RepresentationChoeurService
    from "../services/RepresentationChoeurService";


const service =
    new RepresentationChoeurService();


export default function RepresentationChoeurChanson({

    chansonId,

    titre,

    /*
     * Facultatif.
     *
     * Permet au composant parent
     * de fournir directement les données
     * déjà chargées.
     */
    representation = null,

    chanteurId = null
}) {

    const [data, setData] =
        useState(
            representation
        );

    const [loading, setLoading] =
        useState(
            !representation
        );

    const [error, setError] =
        useState(null);


    useEffect(() => {

        /*
         * Les données ont déjà été chargées
         * par le parent.
         */

        if (representation) {

            setData(
                representation
            );

            setLoading(false);

            return;
        }


        if (!chansonId) {
            return;
        }


        const load = async () => {

            setLoading(true);
            setError(null);


            const response =
                await service
                    .getByChanson(
                        chansonId
                    );


            if (!response.success) {

                setError(
                    response.message
                );

                setLoading(false);

                return;
            }


            setData(
                response.data[
                chansonId
                ]
            );


            setLoading(false);
        };


        load();

    }, [
        chansonId,
        representation
    ]);


    if (loading) {

        return (
            <div>
                Chargement du chœur...
            </div>
        );
    }


    if (error) {

        return (
            <div className="crud-errors">
                {error}
            </div>
        );
    }


    if (!data) {
        return null;
    }


    return (
        <RepresentationChoeur

            pupitres={
                data.pupitres
            }

            titre={
                titre ||
                data.titre
            }
            chanteurId={
                chanteurId
            }

        />
    );
}