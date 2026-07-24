import { Navigate, Outlet, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getChanteurByToken } from "../supabase/chanteur.api";

export default function TokenGuard() {

  const { token } = useParams();
  console.log(token)
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {

    async function check() {

      if (!token) {
        setValid(false);
        setLoading(false);
        return;
      }

      const user = await getChanteurByToken(token);
  console.log("user", user)
      if (user) {
        localStorage.setItem("token", token);
        localStorage.setItem("chanteur", JSON.stringify(user));
        setValid(true);
      } else {
        setValid(false);
      }

      setLoading(false);
    }

    check();

  }, [token]);


  if (loading) {
    return <div>Chargement...</div>;
  }
  console.log("valid", valid)
  if (!valid) {
    return <Navigate to="/invalid-token" />;
  }

  return <Outlet />;
}