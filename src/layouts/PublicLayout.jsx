import React from "react";
import { Link } from "react-router-dom";
import "../styles/public.css";

export default function PublicLayout({ children }) {

    const nomAsso = import.meta.env.VITE_NOM_ASSO;

    return (
        <div className="public-page">

            <main className="public-container">

                {/* Header commun */}
                <header className="public-header">

                    <Link to="/" className="public-logo">
                        <img
                            src="/logoVDE.png"
                            alt={nomAsso}
                        />
                    </Link>

                    <h1>{nomAsso}</h1>

                    <p className="public-subtitle">
                        L'espace numérique de la chorale
                    </p>

                </header>


                {/* Contenu de la page */}
                {children}


                {/* Footer commun */}
                <footer className="public-footer">

                    <Link to="/">
                    <strong>{nomAsso}</strong>
                    </Link>

                    <span>•</span>

                    <span>
                        Espace numérique de la chorale
                    </span>

                    <span>•</span>

                    <Link to="/confidencialite">
                        Confidentialité
                    </Link>

                    <span>•</span>

                    <Link to="/cgu">
                        CGU
                    </Link>

                </footer>

            </main>

        </div>
    );
}