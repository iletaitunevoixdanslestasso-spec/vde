import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { chanteurConfig } from "../../config/entities/chanteur.config";

export default function DashboardChanteur() {

  const [profil, setProfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingRelanceDAI, setSavingRelanceDai] = useState(false);
  const [savingRelancePupitre, setSavingRelancePupitre] = useState(false);

  const token = localStorage.getItem("token");

  const controller = chanteurConfig.controller;


  /*
   * Chargement du profil
   */
  async function loadProfil() {

    setLoading(true);

    controller.initialize({
      token
    });

    const result =
      await controller.loadItemByToken();

    if (result.success) {

      const data = Array.isArray(result.data)
        ? result.data[0]
        : result.data;

      setProfil(data);
    }

    setLoading(false);
  }


  useEffect(() => {

    if (!token) {
      setLoading(false);
      return;
    }

    loadProfil();

  }, [token]);


  /*
   * Stop / activation des relances DAI
   */
  async function toggleRelanceDai() {

    if (!profil || savingRelanceDAI) {
      return;
    }

    setSavingRelanceDai(true);

    const nouveauEtat =
      !profil.stop_relance_dai;

    const result =
      await controller.updateStopRelanceDai(
        nouveauEtat
      );

    if (result.success) {

      setProfil(prev => ({
        ...prev,
        stop_relance_dai: nouveauEtat
      }));
    }

    setSavingRelanceDai(false);
  }


  async function toggleRelancePupitre() {

    if (!profil || savingRelancePupitre) {
      return;
    }

    setSavingRelancePupitre(true);

    const nouveauEtat =
      !profil.stop_relance_pupitre;

    const result =
      await controller.updateStopRelancePupitre(
        nouveauEtat
      );

    if (result.success) {

      setProfil(prev => ({
        ...prev,
        stop_relance_pupitre: nouveauEtat
      }));
    }

    setSavingRelancePupitre(false);
  }


  if (loading) {
    return (
      <div className="dashboard-loading">
        Chargement...
      </div>
    );
  }


  if (!profil) {
    return (
      <div className="dashboard-error">
        Impossible de charger votre profil.
      </div>
    );
  }




  /*
   * TODO
   */

  const todoDai =
    profil.droit_image_workflow !== 2;

  const todoPupitre =
    !profil.pupitre_id;


  return (
    <div className="dashboard-chanteur">

      <h1 className="dashboard-title">
        <span className="icon icon-musical-note"></span>
        Bonjour {profil.prenom} ET MAINTEN AL
      </h1>


      <section className="dashboard-todo">

        <h2>
          <span className="icon icon-todo"></span>
          À faire
        </h2>


        {/* TODO DAI */}

        {todoDai && (

          <div className="todo-item todo-dai">

            <div className="todo-icon">
              <span className="icon icon-warning"></span>
            </div>

            <div className="todo-content">

              <div className="todo-title">
                Mettre à jour votre DAI
              </div>

              <div className="todo-description">
                Votre droit à l'image doit être
                mis à jour dans la rubrique
                <Link
                  to={`/chanteur/${token}/profil`}
                  className="todo-button"
                >
                  <span className="icon icon-chanteur"></span>
                  « Mon profil ».
                </Link>
              </div>

              <div className="todo-actions">


                <button
                  type="button"
                  className="todo-button todo-button-secondary"
                  onClick={toggleRelanceDai}
                  disabled={savingRelanceDAI}
                >

                  <span
                    className={
                      profil.stop_relance_dai
                        ? "icon icon-notification-on"
                        : "icon icon-notification-off"
                    }
                  ></span>

                  {savingRelanceDAI
                    ? "Modification..."
                    : profil.stop_relance_dai
                      ? "Activer la relance automatique"
                      : "Stop relance"
                  }

                </button>

              </div>

            </div>

          </div>

        )}


        {/* TODO PUPITRE */}

        {todoPupitre && (

          <div className="todo-item todo-pupitre">

            <div className="todo-icon">
              <span className="icon icon-warning"></span>
            </div>

            <div className="todo-content">

              <div className="todo-title">
                Choisir votre pupitre par défaut
              </div>

              <div className="todo-description">
                Vous devez choisir votre pupitre
                principal pour la saison.
                <Link
                  to={`/chanteur/${token}/profil`}
                  className="todo-button"
                >
                  <span className="icon icon-chanteur"></span>
                  « Mon profil ».
                </Link>
              </div>

              <div className="todo-actions">

                <button
                  type="button"
                  className="todo-button todo-button-secondary"
                  onClick={toggleRelancePupitre}
                  disabled={savingRelancePupitre}
                >

                  <span
                    className={
                      profil.stop_relance_pupitre
                        ? "icon icon-notification-on"
                        : "icon icon-notification-off"
                    }
                  ></span>

                  {savingRelancePupitre
                    ? "Modification..."
                    : profil.stop_relance_pupitre
                      ? "Activer la relance automatique"
                      : "Stop relance"
                  }

                </button>
              </div>

            </div>

          </div>

        )}


        {/* Aucune TODO */}

        {!todoDai && !todoPupitre && (

          <div className="todo-empty">

            <span className="icon icon-check"></span>

            <span>
              Tout est à jour !
            </span>

          </div>

        )}

      </section>

    </div>
  );
}