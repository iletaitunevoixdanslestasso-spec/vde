import { useState } from "react";
import { supabase } from "../../../../core/supabase/client";
import { useNavigate  } from "react-router-dom";

export default function AdminLogin() {
  const [email, setEmail] = useState(null);
  const [password, setPassword] = useState(null);
   const navigate = useNavigate();
  const login = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error(error.message);
      return;
    }

    console.log("Login OK", data);
    if (data.session) {
      navigate("/admin");
    }    
  };

  return (
    <div>
      <h1>Admin login</h1>

      <input
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        placeholder="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={login}>Connexion</button>
    </div>
  );
}