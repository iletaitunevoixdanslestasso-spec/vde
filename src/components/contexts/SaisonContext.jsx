import { createContext, useContext, useEffect, useState } from "react";

import { SaisonController } from "../../controllers/SaisonController";
import { SaisonService } from "../../services/SaisonService";
import { SaisonRepository } from "../../repositories/SaisonRepository";
import { SaisonValidator } from "../../validators/SaisonValidator";
import { SaisonMapper } from "../../mappers/SaisonMapper";


const repository = new SaisonRepository("saisons");
const validator = new SaisonValidator([]);
const mapper = new SaisonMapper([]);

const service = new SaisonService(
    repository,
    validator,
    mapper
);

const controller = new SaisonController(service);

const SaisonContext = createContext();

export function SaisonProvider({ children }) {
    

    // c'est la saison ACTIVE il n'y en a qu'une
    const [saisonActive, setSaisonActive] = useState(null);
    const [saisonSelectionne, setSaisonSelectionne] = useState(null);
    const [saisons, setSaisons] = useState([]);


    useEffect(() => {

        controller.getActive(
            (saison) => {
                setSaisonActive(saison);
            },
            (errors) => {
                console.error(errors);
            }
        );

    }, []);


    useEffect(() => {
        refresh();
    }, []);


    const refresh = () => {

        controller.getAll(
            (liste) => {

                const saisonsTriees = [...liste]
                    .filter(s => !s.supprime)
                    .sort((a, b) => {

                        if (a.active && !b.active) return -1;
                        if (!a.active && b.active) return 1;

                        return b.date_debut.localeCompare(a.date_debut);
                    });


                setSaisons(saisonsTriees);


                const active = saisonsTriees.find(s => s.active) ?? null;

                setSaisonActive(active);


                setSaisonSelectionne(prev => {

                    if (!prev) {
                        return active;
                    }

                    return saisonsTriees.find(
                        s => s.id === prev.id
                    ) ?? active;

                });

            },
            console.error
        );

    };


    const updateSaisonActive = (saison) => {
        setSaisonActive(saison);
    };


    const updateSaisonSelectionne = (saison) => {


        setSaisonSelectionne(saison);
    };


    return (
        <SaisonContext.Provider
            value={{
                saisons,
                saisonActive,
                saisonSelectionne,

                refresh,

                updateSaisonActive,
                updateSaisonSelectionne
            }}
        >
            {children}
        </SaisonContext.Provider>
    );
}


export function useSaison() {
    return useContext(SaisonContext);
}