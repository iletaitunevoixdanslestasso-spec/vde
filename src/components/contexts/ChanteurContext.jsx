import { createContext, useContext, useEffect, useRef, useState } from "react";
import { chanteurConfig } from "../../config/entities/chanteur.config";

const ChanteurContext = createContext(null);

function ChanteurProvider_old({ children }) {

    const controller = chanteurConfig.controller;
    const token = localStorage.getItem("token");
    // const saisonChanteur = JSON.parse(localStorage.getItem("chanteur")).chanteur;
    const stored = JSON.parse(localStorage.getItem("chanteur"));

console.log("LOCALSTORAGE CHANTEUR", stored);
console.log("LOCALSTORAGE SAISON CHANTEUR", stored?.chanteur);

const saisonChanteur = stored?.chanteur ?? null;

    const [chanteur, setChanteur] = useState(null);
    const [loadingChanteur, setLoadingChanteur] = useState(true);

    const profilCharge = useRef(false);

    useEffect(() => {

        if (profilCharge.current) {
            return;
        }

        profilCharge.current = true;

        async function loadProfil() {

            if (!token) {
                setLoadingChanteur(false);
                return;
            }

            controller.initialize({
                token
            });

            const result = await controller.loadItemByToken();

            if (result.success) {

                const data = Array.isArray(result.data)
                    ? result.data[0]
                    : result.data;

                const dataAvecSaison = {
                    ...data,
                    saisonChanteur
                }
                setChanteur(dataAvecSaison);
            }

            setLoadingChanteur(false);
        }

        loadProfil();

    }, [token]);


    return (
        <ChanteurContext.Provider
            value={{
                token,
                chanteur,
                setChanteur,
                loadingChanteur,
                setLoadingChanteur
            }}
        >
            {children}
        </ChanteurContext.Provider>
    );
}


export function ChanteurProvider({ children }) {

    const controller = chanteurConfig.controller;
    const token = localStorage.getItem("token");

    const [chanteur, setChanteur] = useState(null);
    const [loadingChanteur, setLoadingChanteur] = useState(true);

    const profilCharge = useRef(false);

    useEffect(() => {

        if (profilCharge.current) {
            return;
        }

        profilCharge.current = true;

        async function loadProfil() {

            if (!token) {
                setLoadingChanteur(false);
                return;
            }

            controller.initialize({
                token
            });

            const result = await controller.loadItemByToken();

            if (result.success) {

                const data = Array.isArray(result.data)
                    ? result.data[0]
                    : result.data;

                // On récupère l'ancien contexte saison si disponible
                const ancienChanteur =
                    JSON.parse(
                        localStorage.getItem("chanteur") || "null"
                    );

                const saisonChanteur =
                    ancienChanteur?.chanteur?.saisonChanteur
                    || ancienChanteur?.saisonChanteur
                    || null;

                const dataAvecSaison = {
                    ...data,
                    saisonChanteur
                };

                console.log(
                    "CHANTEUR FINAL",
                    dataAvecSaison
                );

                console.log(
                    "SAISON CHANTEUR",
                    dataAvecSaison.saisonChanteur
                );

                setChanteur(dataAvecSaison);
            }

            setLoadingChanteur(false);
        }

        loadProfil();

    }, [token]);


    return (
        <ChanteurContext.Provider
            value={{
                token,
                chanteur,
                setChanteur,
                loadingChanteur,
                setLoadingChanteur
            }}
        >
            {children}
        </ChanteurContext.Provider>
    );
}

export function useChanteur() {
    return useContext(ChanteurContext);
}
