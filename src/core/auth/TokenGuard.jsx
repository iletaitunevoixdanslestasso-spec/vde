import { Navigate, Outlet, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import { getChanteurByToken } from "../supabase/chanteur.api";
import { getSaisonActive } from "../supabase/saison.api";

export default function TokenGuard() {

  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {

    async function check() {

      if (!token) {
        setValid(false);
        setLoading(false);
        return;
      }

      // 1. Vérifier le token
      const user = await getChanteurByToken(token);

      if (!user) {
        setValid(false);
        setLoading(false);
        return;
      }

      // 2. Récupérer la saison active
      const saisonActive = await getSaisonActive();

      if (!saisonActive) {
        setValid(false);
        setLoading(false);
        return;
      }

      // 3. Stocker les informations
      localStorage.setItem("token", token);
      localStorage.setItem("chanteur", JSON.stringify(user));

      // 4. Comparer les saisons
      const tokenSaisonId = user.saisonId;

      const active =
        tokenSaisonId === saisonActive.id;

      setIsActive(active);
      setValid(true);
      setLoading(false);
    }

    check();

  }, [token]);


  if (loading) {
    return <div>Chargement...</div>;
  }

  if (!valid) {
    return <Navigate to="/invalid-token" replace />;
  }

  // Token valide mais saison non active
  if (!isActive) {
    return (
      <Navigate
        to={`/chanteur/${token}/inscription`}
        replace
      />
    );
  }

  // Token valide + saison active
  return <Outlet />;
}