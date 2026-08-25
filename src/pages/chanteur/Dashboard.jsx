import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { chanteurConfig } from "../../config/entities/chanteur.config";
import { rendezvouConfig } from "../../config/entities/rendezvou.config";
import { repetitionConfig } from "../../config/entities/repetition.config";

export default function DashboardChanteur() {

  const [profil, setProfil] = useState(null);
  const [loading, setLoading] = useState(true);

  const [rendezvous, setRendezvous] = useState([]);
  const [loadingRendezvous, setLoadingRendezvous] = useState(true);

  const [savingRelanceDAI, setSavingRelanceDai] = useState(false);
  const [savingRelancePupitre, setSavingRelancePupitre] = useState(false);

  const [todoOpen, setTodoOpen] = useState(true);
  const [rendezvousOpen, setRendezvousOpen] = useState(true);

  const token = localStorage.getItem("token");

  const controller = chanteurConfig.controller;

  const rendezvouController =
    rendezvouConfig.controller;

  const repetitionController =
    repetitionConfig.controller;


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
      console.log(data)
      setProfil(data);

      return data;
    }

    setLoading(false);

    return null;
  }


  /*
   * Chargement des rendez-vous du dashboard
   */
  async function loadRendezvous(profil) {
    const saisonId = profil?.saison_id
    if (!saisonId) {

      setRendezvous([]);
      setLoadingRendezvous(false);

      return;
    }

    setLoadingRendezvous(true);

    try {

      /*
       * Rendez-vous classiques
       *
       * Le type "repet" est volontairement exclu :
       * il représente le rendez-vous parent/fixe
       * des répétitions.
       */
      const rendezvousResult =
        await rendezvouController.getForDashboard(saisonId);


      /*
       * Occurrences de répétitions
       */
      const repetitionsResult =
        await repetitionController.getForDashboard(
          saisonId
        );


      const rendezvousData =
        rendezvousResult.success
          ? rendezvousResult.data || []
          : [];


      const repetitionsData =
        repetitionsResult.success
          ? repetitionsResult.data || []
          : [];


      /*
       * Transformation des rendez-vous classiques
       */
      const rendezvousNormalises =
        rendezvousData
          .filter(item =>
            item.rendezvous_type?.code !== "repet"
          )
          .map(item => ({

            id: `rendezvous-${item.id}`,

            type: "rendezvous",

            typeCode:
              item.rendezvous_type?.code ||
              "rendezvous",

            typeLibelle:
              item.rendezvous_type?.libelle ||
              "Rendez-vous",

            date: item.date,
            debut:item.debut,
            description:
              item.description ||
              item.titre ||
              ""

          }));


      /*
       * Transformation des répétitions
       */

      const repetitionsNormalisees =
        repetitionsData.map((item) => {
            const debut=item.repetitions_type.duree== 90? profil.gdescription : '20h'
            return {

            id: `repetition-${item.id}`,

            type: "repetition",

            /*
            * Classe CSS :
            *
            * rendezvous-type-repet
            *
            * si le rendez-vous parent est de type repet.
            */
            typeCode:
              item.rendezvous?.rendezvous_type?.code ||
              "repet",

            /*
            * On identifie explicitement
            * l'occurrence comme répétition.
            */
            typeLibelle:
              `Répétition ${item.repetitions_type?.libelle}` ||
              "Répétition",

            date: item.date,
            debut:debut,
            description:
              item.description ||
              item.rendezvous?.titre ||
              ""

          }
    });


      /*
       * Fusion
       */
      const liste = [
        ...rendezvousNormalises,
        ...repetitionsNormalisees
      ];


      /*
       * Tri chronologique
       */
      liste.sort((a, b) =>
        new Date(a.date) - new Date(b.date)
      );


      setRendezvous(liste);

    } catch (error) {

      console.error(
        "DashboardChanteur.loadRendezvous",
        error
      );

      setRendezvous([]);

    } finally {

      setLoadingRendezvous(false);

    }
  }


  /*
   * Chargement initial
   */
  useEffect(() => {

    if (!token) {

      setLoading(false);

      return;
    }

    async function loadDashboard() {

      const profilData =
        await loadProfil();

      setLoading(false);

      if (profilData?.saison_id) {

        await loadRendezvous(
          profilData
        );

      } else {

        setLoadingRendezvous(false);

      }
    }

    loadDashboard();

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


  /*
   * Stop / activation des relances pupitre
   */
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


  /*
   * Formatage de la date
   */
  function formatRendezvousDate(date) {

    if (!date) {
      return "";
    }

    const value = new Date(date);

    return value.toLocaleDateString(
      "fr-FR",
      {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }
    );

  }


  /*
   * Formatage de l'heure
   */
  function formatRendezvousTime(date) {

    if (!date) {
      return "";
    }

    const value = new Date(date);

    return value.toLocaleTimeString(
      "fr-FR",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );

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

      <header className="dashboard-header">

        <div className="dashboard-header-icon">
          <span className="icon icon-musical-note"></span>
        </div>

        <div className="dashboard-header-content">

          <div className="dashboard-eyebrow">
            Mon espace chanteur
          </div>

          <h1 className="dashboard-title">
            Bonjour {profil.prenom}
          </h1>

          <p className="dashboard-subtitle">
            Retrouvez ici vos actions à effectuer
            et les prochains rendez-vous de la chorale.
          </p>

        </div>

      </header>


      {/* =====================================================
          TODO
      ===================================================== */}

      <section className="dashboard-todo">

        <h2
          className="dashboard-section-title dashboard-section-title-collapse"
          onClick={() => setTodoOpen(prev => !prev)}
        >

          <span className="dashboard-section-icon">
            <span className="icon icon-todo"></span>
          </span>

          <span>
            <span className="dashboard-section-label">
              À faire
            </span>

            <span className="dashboard-section-description">
              Les actions qui nécessitent votre attention
            </span>
          </span>

        </h2>



        {todoOpen && (
          <div className="dashboard-section-collapse-content">

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
          </div>
        )}

      </section>


      {/* =====================================================
          RENDEZ-VOUS
      ===================================================== */}

      <section className="dashboard-rendezvous">

        <h2
          className="dashboard-section-title dashboard-section-title-collapse"
          onClick={() => setRendezvousOpen(prev => !prev)}
        >

          <span className="dashboard-section-icon">
            <span className="icon icon-calendar"></span>
          </span>

          <span>
            <span className="dashboard-section-label">
              Rendez-vous à venir
            </span>

            <span className="dashboard-section-description">
              Les prochains événements de la chorale
            </span>
          </span>

        </h2>

        {rendezvousOpen && (
          <div className="dashboard-section-collapse-content">
            {loadingRendezvous && (

              <div className="dashboard-rendezvous-loading">
                Chargement des rendez-vous...
              </div>

            )}


            {!loadingRendezvous &&
              rendezvous.length === 0 && (

                <div className="dashboard-rendezvous-empty">

                  <span className="icon icon-calendar"></span>

                  <span>
                    Aucun rendez-vous prévu.
                  </span>

                </div>

              )}


            {!loadingRendezvous &&
              rendezvous.length > 0 && (

                <div className="dashboard-rendezvous-list">

                  {/* En-tête */}

                  <div className="dashboard-rendezvous-header">

                    <div>
                      Type
                    </div>

                    <div>
                      Date
                    </div>

                    <div>
                      Description
                    </div>

                  </div>


                  {/* Lignes */}

                  {rendezvous.map(item => (

                    <div
                      key={item.id}
                      className={
                        `dashboard-rendezvous-row ` +
                        `rendezvous-type-${item.typeCode}`
                      }
                    >

                      <div className="dashboard-rendezvous-type">

                        <span className="dashboard-rendezvous-type-label">
                          {item.typeLibelle}
                        </span>

                      </div>


                      <div className="dashboard-rendezvous-date">

                        <span className="dashboard-rendezvous-date-day">
                          {formatRendezvousDate(item.date)}
                        </span>

                        <span className="dashboard-rendezvous-date-time">
                          {item.debut}
                        </span>

                      </div>


                      <div className="dashboard-rendezvous-description">

                        {item.description || "—"}

                      </div>

                    </div>

                  ))}

                </div>

              )}
          </div>
        )}
      </section>

    </div >

  );
}