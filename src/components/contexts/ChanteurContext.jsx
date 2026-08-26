import { createContext, useContext, useEffect, useRef, useState } from "react";
import { chanteurConfig } from "../../config/entities/chanteur.config";

const ChanteurContext = createContext(null);

export function ChanteurProvider({ children }) {

    const controller = chanteurConfig.controller;
    const token = localStorage.getItem("token");
    const saisonChanteur = JSON.parse(localStorage.getItem("chanteur")).chanteur;

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