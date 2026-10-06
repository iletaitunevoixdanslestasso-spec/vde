import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../core/supabase/client";
import AdminMenu from "../components/AdminiMenu";

import "../styles/espaceAdmin.css";

export default function AdminLayout() {

    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {

        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
        });

    }, []);


    const logout = async () => {

        await supabase.auth.signOut();

        navigate("/admin/login");

    };


    const renderUserHeader = (className) => (
        <header className={`admin-header ${className}`}>

            <div className="admin-header-user">

                <span className="admin-user-icon">
                    👤
                </span>

                <span className="admin-user-email">
                    {user?.email}
                </span>

            </div>


            <button
                type="button"
                className="admin-logout"
                onClick={logout}
                title="Déconnexion"
                aria-label="Déconnexion"
            >
                <span className="admin-logout-icon">
                    ↪
                </span>

                <span>
                    Déconnexion
                </span>
            </button>

        </header>
    );


    return (
        <div className="admin-layout">

            {/* =================================================
                MENU
            ================================================= */}

            <aside className="admin-sidebar">

                <AdminMenu />

                {/*
                    En mobile, le compte est affiché dans la barre du menu,
                    à droite de Saisons / Référentiels.
                    En desktop cette version est masquée par le CSS.
                */}
                {renderUserHeader("admin-header-mobile")}

            </aside>


            {/* =================================================
                CONTENU
            ================================================= */}

            <main className="admin-content">

                {/*
                    Header desktop d'origine.
                    Il est masqué uniquement en mobile.
                */}
                {renderUserHeader("admin-header-desktop")}


                <div className="admin-page">
                    <Outlet />
                </div>

            </main>

        </div>
    );
}
