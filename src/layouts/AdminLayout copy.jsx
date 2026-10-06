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


    return (
        <div className="admin-layout">

            {/* =================================================
                MENU
            ================================================= */}

            <aside className="admin-sidebar">
                <AdminMenu />
            </aside>


            {/* =================================================
                CONTENU
            ================================================= */}

            <main className="admin-content">

                <header className="admin-header">

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
                    >
                        <span className="admin-logout-icon">
                            ↪
                        </span>

                        <span>
                            Déconnexion
                        </span>
                    </button>

                </header>


                <div className="admin-page">
                    <Outlet />
                </div>

            </main>

        </div>
    );
}