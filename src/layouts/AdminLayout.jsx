import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../core/supabase/client";
import AdminMenu from "../components/AdminiMenu";

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

            {/* MENU ADMIN */}
            <aside className="admin-sidebar">
                <AdminMenu />
            </aside>


            {/* CONTENU ADMIN */}
            <main className="admin-content">

                <div className="admin-user">

                    <span>
                        {user?.email}
                    </span>

                    <button onClick={logout}>
                        Déconnexion
                    </button>

                </div>

                <Outlet />

            </main>

        </div>
    );
}