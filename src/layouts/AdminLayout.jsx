import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../core/supabase/client";
import { useSaison } from "../components/contexts/SaisonContext";
import AdminMenu from "../components/AdminiMenu";
import NotificationProvider from "../components/contexts/NotificationProvider";

export default function AdminLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const { saisonActive } = useSaison();


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
    <NotificationProvider>
      <div style={{ display: "flex", height: "100vh", fontFamily: "Arial" }}>

        {/* SIDEBAR */}
        <div style={{
          width: "250px",
          background: "#1e1e2f",
          color: "white",
          padding: "20px"
        }}>
          <h2 className="logo-title">
            <img src="/logoVDE.png" alt="Chorale" />
            <span>Chorale</span>
          </h2>

          {/* <nav style={{ marginTop: "30px" }}>
          <p style={{ cursor: "pointer" }} onClick={() => navigate("/admin")}>
            🏠 Dashboard
          </p>

          <p style={{ cursor: "pointer" }} onClick={() => navigate("/admin/saisons")}>
            📅 Saisons
          </p>
          <p style={{ cursor: "pointer" }} onClick={() => navigate("/admin/chanteurs")}>
            👤 Chanteurs
          </p>

          <p style={{ cursor: "pointer" }} onClick={() => navigate("/admin/chansons")}>
            🎵 Chansons
          </p>

          <p style={{ cursor: "pointer" }} onClick={() => navigate("/admin/concerts")}>
            🎤 Concerts
          </p>

          <p style={{ cursor: "pointer" }} onClick={() => navigate("/admin/repetitions")}>
            🗓 Répétitions
          </p>

          <p style={{ cursor: "pointer" }} onClick={() => navigate("/admin/invitations")}>
            📨 Invitations
          </p>
        </nav> */}
          <AdminMenu />
        </div>

        {/* MAIN */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

          {/* HEADER */}
          <div style={{
            height: "60px",
            background: "#f5f5f5",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 20px"
          }}>
            <div>
              🎼 Saison active : <b>{saisonActive?.nom ?? "Aucune"}</b>
            </div>

            <div>
              {user?.email}
              <button onClick={logout} style={{ marginLeft: "20px" }}>
                Déconnexion
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div style={{ padding: "20px", overflow: "auto", flex: 1 }}>
            <Outlet />
          </div>

        </div>
      </div>
    </NotificationProvider>
  );
}