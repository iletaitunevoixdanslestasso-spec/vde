import { Outlet } from "react-router-dom";
import { useEffect } from "react";

import ChanteurMenu from "./ChanteurMenu";
import { ChanteurProvider, useChanteur } from "./../../components/contexts/ChanteurContext";

import "../../styles/espaceChanteur.css";
import { chanteurConfig } from "../../config/entities/chanteur.config";

function ChanteurLayoutContent() {

    const {
        chanteur,
        setChanteur,
        setLoadingChanteur
    } = useChanteur();



    return (

        <div className="chanteur-layout">

            <aside className="chanteur-sidebar">

                <div className="chanteur-sidebar-inner">

                    {/* ... */}

                    <ChanteurMenu chanteur={chanteur}/>

                </div>

            </aside>

            <main className="chanteur-content">

                <div className="chanteur-content-inner">

                    <Outlet />

                </div>

            </main>

        </div>
    );
}


export default function ChanteurLayout() {

    return (

        <ChanteurProvider>

            <ChanteurLayoutContent />

        </ChanteurProvider>
    );
}