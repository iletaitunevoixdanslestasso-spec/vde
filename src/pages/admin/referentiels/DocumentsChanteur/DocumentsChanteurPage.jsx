import { useEffect, useState } from "react";

import { useChanteur } from "../../../../components/contexts/ChanteurContext";
import { ReferentielDocumentConfig } from "../../../../config/entities/ReferentielDocument.config";
import NotificationService from "../../../../services/NotificationService";

import "../../../../styles/espaceChanteur_documents.css";


export default function DocumentsChanteurPage(context = {}) {

    const {
        chanteur,
        loadingChanteur
    } = useChanteur();

    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const controller = ReferentielDocumentConfig.controller;


    useEffect(() => {

        if (loadingChanteur || !chanteur) {
            return;
        }

        controller.initialize(context);

        const loadDocuments = async () => {

            try {

                setLoading(true);
                setError(null);

                const result =
                    await controller.loadDocumentsChanteur();

                if (!result.success) {

                    NotificationService.error(
                        result.message ||
                        "Problème lors de la recherche des documents."
                    );

                    setError(
                        result.message ||
                        "Impossible de charger les documents."
                    );

                    return;
                }

                setDocuments(result.data || []);

                NotificationService.success(
                    result.message ||
                    "Chargement des documents réussi."
                );

            } catch (err) {

                console.error(
                    "Erreur chargement documents",
                    err
                );

                setError(
                    "Problème lors du chargement des documents."
                );

                NotificationService.error(
                    "Problème lors du chargement des documents."
                );

            } finally {

                setLoading(false);

            }

        };

        loadDocuments();

    }, [chanteur, loadingChanteur]);


    if (loadingChanteur || loading) {
        return (
            <div className="documents-chanteur documents-chanteur--state">
                <div className="documents-loading">
                    <span className="documents-loading__icon">
                        📄
                    </span>

                    <span>
                        Chargement des documents...
                    </span>
                </div>
            </div>
        );
    }


    if (error) {
        return (
            <div className="documents-chanteur documents-chanteur--state">
                <div className="documents-error">
                    <span className="documents-error__icon">
                        ⚠️
                    </span>

                    <strong>
                        Impossible de charger les documents
                    </strong>

                    <span>
                        {error}
                    </span>
                </div>
            </div>
        );
    }


    const documentsChoriste = documents.filter(
        document =>
            document.document_types?.code === "choriste"
    );

    const documentsAdherent = documents.filter(
        document =>
            document.document_types?.code === "adherent"
    );


    const renderDocumentSection = ({
        title,
        icon,
        documents
    }) => {

        if (documents.length === 0) {
            return null;
        }

        return (
            <section className="documents-section">

                <div className="documents-section__header">

                    <div className="documents-section__icon">
                        {icon}
                    </div>

                    <div>
                        <h2>
                            {title}
                        </h2>

                        <span className="documents-section__count">
                            {documents.length} document
                            {documents.length > 1 ? "s" : ""}
                        </span>
                    </div>

                </div>


                <div className="documents-list">

                    {documents.map(document => (

                        <a
                            key={document.id}
                            href={document.downloadUrl || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`document-item ${
                                !document.downloadUrl
                                    ? "document-item--disabled"
                                    : ""
                            }`}
                            onClick={event => {
                                if (!document.downloadUrl) {
                                    event.preventDefault();
                                }
                            }}
                        >

                            <div className="document-item__icon">
                                📄
                            </div>


                            <div className="document-item__content">

                                <span className="document-item__title">
                                    {document.titre}
                                </span>

                                {document.document_types?.libelle && (
                                    <span className="document-item__type">
                                        {document.document_types.libelle}
                                    </span>
                                )}

                            </div>


                            <div className="document-item__action">
                                {document.downloadUrl
                                    ? "↗"
                                    : "⚠️"
                                }
                            </div>

                        </a>

                    ))}

                </div>

            </section>
        );
    };


    return (
        <div className="documents-chanteur">

            <header className="documents-header">

                <div className="documents-header__icon">
                    📄
                </div>

                <div>
                    <h1>
                        Documents
                    </h1>

                    <p>
                        Retrouvez ici les documents utiles à votre activité.
                    </p>
                </div>

            </header>


            {renderDocumentSection({
                title: "Documents choriste",
                icon: "🎤",
                documents: documentsChoriste
            })}


            {renderDocumentSection({
                title: "Documents adhérent",
                icon: "👤",
                documents: documentsAdherent
            })}


            {documents.length === 0 && (
                <div className="documents-empty">

                    <div className="documents-empty__icon">
                        📂
                    </div>

                    <strong>
                        Aucun document disponible
                    </strong>

                    <span>
                        Aucun document n'est actuellement disponible.
                    </span>

                </div>
            )}

        </div>
    );
}
