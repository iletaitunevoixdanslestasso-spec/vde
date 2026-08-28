import "./../styles/RepresentationChoeur.css";

function IconChanteur() {
    return (
        <svg
            className="icon-chanteurs"
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <circle cx="12" cy="7" r="4" />
            <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
        </svg>
    );
}

export default function RepresentationChoeur({
    pupitres = [],
    titre = "Le chœur",
}) {

    if (!pupitres.length) {
        return (
            <div className="representation-choeur empty">
                <div className="choeur-empty-icon">🎵</div>
                <div className="choeur-empty-text">
                    Aucun pupitre à afficher
                </div>
            </div>
        );
    }

    return (
        <div className="representation-choeur">

            {/* =========================================
                TITRE
            ========================================= */}

            <div className="choeur-header">

                <div className="choeur-header-icon">
                    🎵
                </div>

                <div>
                    <h3 className="choeur-title">
                        {titre}
                    </h3>

                    <div className="choeur-subtitle">
                        {pupitres.reduce(
                            (total, pupitre) =>
                                total + (pupitre.chanteurs?.length || 0),
                            0
                        )} chanteurs
                    </div>
                </div>

            </div>


            {/* =========================================
                SCÈNE / ARC DU CHŒUR
            ========================================= */}

            <div className="choeur-scene">

                <div className="choeur-arc">

                    {pupitres.map((pupitre, index) => {

                        const chanteurs =
                            pupitre.chanteurs || [];

                        return (
                            <div
                                key={pupitre.id || pupitre.code || index}
                                className="choeur-pupitre"
                                style={{
                                    "--pupitre-color":
                                        pupitre.couleur || "#64748b",

                                    "--pupitre-angle":
                                        `${(index - (pupitres.length - 1) / 2) * 18}deg`,
                                }}
                            >

                                {/* Nom du pupitre */}

                                <div className="pupitre-label">

                                    <span
                                        className="pupitre-label-dot"
                                    />

                                    <span>
                                        {pupitre.nom}
                                    </span>

                                    <span className="pupitre-count">
                                        {chanteurs.length}
                                    </span>

                                </div>


                                {/* Chanteurs */}

                                <div className="pupitre-chanteurs">

                                    {chanteurs.map(
                                        (chanteur, chanteurIndex) => (

                                            <div
                                                key={
                                                    chanteur.id ||
                                                    chanteurIndex
                                                }
                                                className="chanteur"
                                                title={
                                                    chanteur.prenom ||
                                                    chanteur.nom
                                                        ? `${chanteur.prenom || ""} ${chanteur.nom || ""}`.trim()
                                                        : undefined
                                                }
                                            >

                                                <IconChanteur />

                                            </div>

                                        )
                                    )}

                                </div>

                            </div>
                        );
                    })}

                </div>


                {/* =====================================
                    CHEF DE CHŒUR
                ===================================== */}

                <div className="chef-choeur">

                    <div className="chef-choeur-icon">
                        🎼
                    </div>

                    <span>
                        Chef de chœur
                    </span>

                </div>

            </div>


            {/* =========================================
                LÉGENDE
            ========================================= */}

            <div className="choeur-legende">

                {pupitres.map((pupitre, index) => (

                    <div
                        key={pupitre.id || pupitre.code || index}
                        className="legende-item"
                    >

                        <span
                            className="legende-color"
                            style={{
                                backgroundColor:
                                    pupitre.couleur || "#64748b",
                            }}
                        />

                        <span>
                            {pupitre.nom}
                        </span>

                    </div>

                ))}

            </div>

        </div>
    );
}