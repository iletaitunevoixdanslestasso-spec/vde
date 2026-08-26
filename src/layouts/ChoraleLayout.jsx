import { Outlet } from "react-router-dom";
import { useSaison } from "../components/contexts/SaisonContext";
import NotificationProvider from "../components/contexts/NotificationProvider";

import "../styles/chorale.css";

export default function ChoraleLayout() {

    const { saisonActive } = useSaison();
    const styleHeader = import.meta.env.DEV ? {display:'none'} : {}
    console.log(styleHeader)
    return (
        <NotificationProvider>

            <div className="chorale-layout" >

                {/* HEADER COMMUN */}
                <header className="chorale-header" style={styleHeader} >

                    <div className="chorale-brand">

                        <img
                            src="/logoVDE.png"
                            alt="Chorale"
                        />
                    </div>

                    <div className="chorale-saison">

                        🎼

                        <strong>
                            {saisonActive?.nom ?? "Aucune"}
                        </strong>

                    </div>

                </header>


                {/* CONTENU */}
                <div className="chorale-body">

                    <Outlet />

                </div>

            </div>

        </NotificationProvider>
    );
}