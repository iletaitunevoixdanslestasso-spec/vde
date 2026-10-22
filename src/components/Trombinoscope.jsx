import { useEffect, useState } from "react";
import { supabase } from "../../core/supabase/client";

export default function Trombinoscope({ token }) {

    const [chanteurs, setChanteurs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {

        let active = true;

        async function load() {

            setLoading(true);
            setError(null);

            const { data, error } =
                await supabase.functions.invoke(
                    "get-trombinoscope",
                    {
                        body: { token }
                    }
                );

            if (!active) return;

            if (error) {
                setError("Impossible de charger le trombinoscope");
            } else {
                setChanteurs(data?.chanteurs ?? []);
            }

            setLoading(false);
        }

        if (token) load();
        else {
            setChanteurs([]);
            setLoading(false);
        }

        return () => {
            active = false;
        };

    }, [token]);

    if (loading) return <p>Chargement...</p>;
    if (error) return <p>{error}</p>;

    return (
        <div className="trombinoscope">

            {chanteurs.map(chanteur => (
                <div
                    key={chanteur.id}
                    className="trombinoscope-item"
                >
                    {chanteur.photo_url ? (
                        <img
                            src={chanteur.photo_url}
                            alt={`${chanteur.prenom} ${chanteur.nom}`}
                            loading="lazy"
                        />
                    ) : (
                        <div className="trombinoscope-placeholder">
                            👤
                        </div>
                    )}

                    <div>
                        {chanteur.prenom} {chanteur.nom}
                    </div>
                </div>
            ))}

        </div>
    );
}