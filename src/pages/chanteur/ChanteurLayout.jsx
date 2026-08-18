import { Outlet } from "react-router-dom";
import ChanteurMenu from "./ChanteurMenu";

export default function ChanteurLayout() {

    return (
        <div className="chanteur-layout">

            {/* MENU CHANTEUR */}
            <aside className="chanteur-sidebar">
                <ChanteurMenu />
            </aside>


            {/* CONTENU CHANTEUR */}
            <main className="chanteur-content">
                <Outlet />
            </main>

        </div>
    );
}