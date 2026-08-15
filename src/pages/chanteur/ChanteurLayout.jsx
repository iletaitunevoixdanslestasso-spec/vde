import { Outlet } from "react-router-dom";
import ChanteurMenu from "./ChanteurMenu";
import NotificationProvider from "../../components/contexts/NotificationProvider";


export default function ChanteurLayout() {
    return (
        <NotificationProvider>
            <div
                style={{
                    display: "flex",
                    minHeight: "100vh"
                }}
            >
                {/* MENU GAUCHE */}
                <aside
                    style={{
                        width: "220px",
                        padding: "20px",
                        borderRight: "1px solid #ddd",
                        backgroundColor: "#f8f8f8"
                    }}
                >
                    <ChanteurMenu />
                </aside>

                {/* CONTENU CENTRAL */}
                <main
                    style={{
                        flex: 1,
                        padding: "30px"
                    }}
                >
                    <Outlet />
                </main>
            </div>
        </NotificationProvider>
    );
}