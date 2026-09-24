import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/espaceChanteur_dashboard.css";
import { chanteurConfig } from "../../config/entities/chanteur.config";
import { rendezvouConfig } from "../../config/entities/rendezvou.config";
import { repetitionConfig } from "../../config/entities/repetition.config";
import { useChanteur } from "../../components/contexts/ChanteurContext";
import ConcertParticipation from "../../components/ConcertParticipation";
import { saisonconcertConfig } from "../../config/entities/saisonconcert.config";
import { truncateText } from "../../helper/helper";


function formatRendezvousDate(date) {
  if (!date) {
    return "";
  }

  return new Date(date).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function TodoItem({
  title,
  children,
  icon = "icon-warning",
  action,
  actionLabel,
  actionIcon,
  disabled = false
}) {
  return (
    <div className="todo-item">

      <div className="todo-icon">
        <span className={`icon ${icon}`} />
      </div>

      <div className="todo-content">

        <div className="todo-title">
          {title}
        </div>

        <div className="todo-description">
          {children}
        </div>

        {action && (
          <div className="todo-actions">
            <button
              type="button"
              className="todo-button todo-button-secondary"
              onClick={action}
              disabled={disabled}
            >
              {actionIcon && (
                <span className={`icon ${actionIcon}`} />
              )}

              {actionLabel}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}


function RendezvousRow({ item, onInfo, onParticipation }) {

  const isConcert = item.typeCode === "concert";
  const participationIcon =
    item.participation === true
      ? "icon-accepted"
      : item.participation === false
        ? "icon-cancel"
        : "icon-unknown";

  const libelle = item?.lieu 
  ?`${item?.lieu?.nom ? item?.lieu?.nom :  '' } ${item?.lieu?.ville ? ` à ${item.lieu.ville.toUpperCase()}` : 'A définir'}`
  : false


  return (
    <div
      className={
        `dashboard-rendezvous-row rendezvous-type-${item.typeCode}`
      }
    >

      {/* TYPE */}
      <div className="dashboard-rendezvous-type">
        <span className="dashboard-rendezvous-type-label">
          {item.typeLibelle}
        </span>
      </div>


      {/* DATE */}
      <div className="dashboard-rendezvous-date">

        <span className="dashboard-rendezvous-date-day">
          {formatRendezvousDate(item.date)}
        </span>

        {item.debut && (
          <span className="dashboard-rendezvous-date-time">
            {item.debut}
          </span>
        )}

      </div>


      {/* INFORMATIONS */}
      <div className="dashboard-rendezvous-description">

        {item.lieu && (
          <div className="dashboard-rendezvous-lieu">


            <button
              type="button"
              alt={libelle}
              title={libelle}
              className="dashboard-rendezvous-info-button"
              onClick={() => onInfo(item, "lieu")}
            >
              <span className="dashboard-rendezvous-lieu-ville">
                {truncateText(libelle)}
              </span>
            </button>

          </div>
        )}

        {item.description && (
          <button
            type="button"
            className="dashboard-rendezvous-info-button"
            onClick={() => onInfo(item, "description")}
          >
            <span className="icon icon-info" />
            Infos
          </button>
        )}


        {isConcert && (
          <button
            type="button"
            className="dashboard-rendezvous-participation-button"
            onClick={() => onParticipation(item)}
            title="Modifier ma participation"
          >
            <span
              className={`icon ${participationIcon} dashboard-rendezvous-participation`}
            />
          </button>
        )}

      </div>

    </div>
  );
}


export default function DashboardChanteur() {


  const [loading, setLoading] = useState(true);
  const [selectedConcert, setSelectedConcert] = useState(null);

  const {
    chanteur,
    loadingChanteur,
    setChanteur
  } = useChanteur();

  const [rendezvous, setRendezvous] = useState([]);
  const [loadingRendezvous, setLoadingRendezvous] = useState(true);
  const [rendezvousSort, setRendezvousSort] = useState({
    field: "date",
    direction: "asc"
  });
  const [rendezvousTypeFilter, setRendezvousTypeFilter] = useState("all");

  const [savingRelanceDAI, setSavingRelanceDai] = useState(false);
  const [savingRelancePupitre, setSavingRelancePupitre] = useState(false);

  const [todoOpen, setTodoOpen] = useState(true);
  const [rendezvousOpen, setRendezvousOpen] = useState(true);

  const token = localStorage.getItem("token");
  const [selectedRendezvous, setSelectedRendezvous] = useState(null);

  const [selectedRendezvousInfoType, setSelectedRendezvousInfoType] = useState(null);
  const controller = chanteurConfig.controller;

  const rendezvouController =
    rendezvouConfig.controller;

  const repetitionController =
    repetitionConfig.controller;




  /*
   * Chargement des rendez-vous du dashboard
   */
  async function loadRendezvous(chanteur) {
    const saisonId = chanteur?.saison_id
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
        await rendezvouController.getForDashboard(chanteur);


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
          .map(item => {


            // const rendezvous = item.rendezvous;
            const rendezvous = item;
            const lieu = rendezvous?.lieux || null;
            const typeCode =
              rendezvous.rendezvous_type?.code ||
              "rendezvous";
            return {
              saison_rendezvous: [item.saison_rendezvous],

              key: `${typeCode}-${item.id}`,
              id: rendezvous.id,
              type: typeCode,

              typeCode,
              typeNom:
                rendezvous.rendezvous_type?.libelle ||
                "Rendez-vous",
              typeLibelle:
                `${rendezvous.rendezvous_type?.libelle ||
                "Rendez-vous"} ${rendezvous.titre}`,

              date: rendezvous.date,
              debut: rendezvous.debut,

              titre: rendezvous.titre || "",

              description: rendezvous.description || "",

              lieu,

              participation:
                rendezvous.rendezvous_type?.code === "concert"
                  ? rendezvous.participation
                  : null
            }
          }
          );


      /*
       * Transformation des répétitions
       */

      const repetitionsNormalisees =
        repetitionsData.map((item) => {
          const debut = item.repetitions_type.duree == 90 ? chanteur.gdescription : '20h'
          return {

            key: `repetition-${item.id}`,
            id: item.id,

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
            typeNom: "Répétition",
            /*
            * On identifie explicitement
            * l'occurrence comme répétition.
            */
            typeLibelle:
              `Répétition ${item.repetitions_type?.libelle}` ||
              "Répétition",
            lieu: item.rendezvous.lieux,
            date: item.date,
            debut: debut,
            description: `${item.description ||
              item.rendezvous?.titre ||
              ""} ${item.accompagne ? 'INSTRUMENTAL' : 'A CAPELA'}`

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
  function openRendezvousInfo(item, type) {
    setSelectedRendezvous(item);
    setSelectedRendezvousInfoType(type);
  }

  function closeRendezvousInfo() {
    setSelectedRendezvous(null);
    setSelectedRendezvousInfoType(null);
  }

  /*
   * Chargement initial
   */
  useEffect(() => {

    if (loadingChanteur) {
      return;
    }

    setLoading(false);

    if (chanteur?.saison_id) {

      loadRendezvous(chanteur);

    } else {

      setLoadingRendezvous(false);

    }

  }, [chanteur, loadingChanteur]);

  /*
   * Stop / activation des relances DAI
   */
  async function toggleRelanceDai() {

    if (!chanteur || savingRelanceDAI) {
      return;
    }

    setSavingRelanceDai(true);

    const nouveauEtat =
      !chanteur.stop_relance_dai;

    const result =
      await controller.updateStopRelanceDai(
        nouveauEtat
      );

    if (result.success) {

      setChanteur(prev => ({
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

    if (!chanteur || savingRelancePupitre) {
      return;
    }

    setSavingRelancePupitre(true);

    const nouveauEtat =
      !chanteur.stop_relance_pupitre;

    const result =
      await controller.updateStopRelancePupitre(
        nouveauEtat
      );

    if (result.success) {

      setChanteur(prev => ({
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



  function changeRendezvousSort(field) {

    setRendezvousSort(prev => {

      if (prev.field === field) {
        return {
          field,
          direction:
            prev.direction === "asc"
              ? "desc"
              : "asc"
        };
      }

      return {
        field,
        direction: "asc"
      };
    });
  }



  if (loading || loadingChanteur) {

    return (
      <div className="dashboard-loading">
        Chargement...
      </div>
    );

  }


  if (!chanteur) {

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
    chanteur.droit_image_workflow !== 1 &&
    chanteur.droit_image_workflow !== 2
    ;

  const todoPupitre =
    !chanteur.pupitre_id;

  const todoParticipation =
    true


  const toutEstFait = !todoDai && !todoPupitre && !todoParticipation

  const rendezvousFiltres =
    rendezvousTypeFilter === "all"
      ? rendezvous
      : rendezvous.filter(
        item => item.typeCode === rendezvousTypeFilter
      );

  const rendezvousTries = [...rendezvousFiltres].sort((a, b) => {

    let comparaison = 0;

    switch (rendezvousSort.field) {

      case "type":
        comparaison = (a.typeLibelle || "").localeCompare(
          b.typeLibelle || "",
          "fr",
          {
            sensitivity: "base"
          }
        );
        break;


      case "date":
      default:
        comparaison =
          new Date(a.date) -
          new Date(b.date);
        break;
    }


    /*
     * En cas d'égalité sur le type,
     * on trie ensuite par date.
     */
    if (
      comparaison === 0 &&
      rendezvousSort.field === "type"
    ) {
      comparaison =
        new Date(a.date) -
        new Date(b.date);
    }


    return rendezvousSort.direction === "asc"
      ? comparaison
      : -comparaison;
  });

  const rendezvousTypes = [
    ...new Map(
      rendezvous.map(item => [
        item.typeCode,
        {
          code: item.typeCode,
          libelle: item.typeNom
        }
      ])
    ).values()
  ];

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
            Bonjour {chanteur.prenom}
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
              <TodoItem
                title="Mettre à jour votre DAI"
                action={toggleRelanceDai}
                disabled={savingRelanceDAI}
                actionIcon={
                  chanteur.stop_relance_dai
                    ? "icon-notification-on"
                    : "icon-notification-off"
                }
                actionLabel={
                  savingRelanceDAI
                    ? "Modification..."
                    : chanteur.stop_relance_dai
                      ? "Activer la relance automatique"
                      : "Stop relance"
                }
              >
                Votre droit à l'image doit être mis à jour dans la rubrique{" "}
                <Link
                  to={`/chanteur/${token}/profil`}
                  className="todo-button"
                >
                  <span className="icon icon-chanteur" />
                  « Mon profil »
                </Link>.
              </TodoItem>
            )}


            {todoParticipation && (
              <TodoItem
                title="Votre participation aux concerts"
                action={toggleRelancePupitre}
                disabled={savingRelancePupitre}
                actionIcon={
                  chanteur.stop_relance_pupitre
                    ? "icon-notification-on"
                    : "icon-notification-off"
                }
                actionLabel={
                  savingRelancePupitre
                    ? "Modification..."
                    : chanteur.stop_relance_pupitre
                      ? "Activer la relance automatique"
                      : "Stop relance"
                }
              >
                Indiquez votre participation aux{" "}
                <Link
                  to={`/chanteur/${token}/concerts`}
                  className="todo-button"
                >
                  <span className="icon icon-concerts" />
                  concerts
                </Link>.
              </TodoItem>
            )}


            {todoPupitre && (
              <TodoItem
                title="Choisir votre pupitre par défaut"
                action={toggleRelancePupitre}
                disabled={savingRelancePupitre}
                actionIcon={
                  chanteur.stop_relance_pupitre
                    ? "icon-notification-on"
                    : "icon-notification-off"
                }
                actionLabel={
                  savingRelancePupitre
                    ? "Modification..."
                    : chanteur.stop_relance_pupitre
                      ? "Activer la relance automatique"
                      : "Stop relance"
                }
              >
                Vous devez choisir votre pupitre principal pour la saison.{" "}
                <Link
                  to={`/chanteur/${token}/profil`}
                  className="todo-button"
                >
                  <span className="icon icon-chanteur" />
                  « Mon profil »
                </Link>.
              </TodoItem>
            )}


            {toutEstFait && (
              <div className="todo-empty">
                <span className="icon icon-check" />
                <span>Tout est à jour !</span>
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
                  <div className="dashboard-rendezvous-filters">

                    <label htmlFor="rendezvous-type-filter">
                      Afficher :
                    </label>

                    <select
                      id="rendezvous-type-filter"
                      value={rendezvousTypeFilter}
                      onChange={event =>
                        setRendezvousTypeFilter(event.target.value)
                      }
                    >
                      <option value="all">
                        Tous les types
                      </option>

                      {rendezvousTypes.map(type => (
                        <option
                          key={type.code}
                          value={type.code}
                        >
                          {type.libelle}
                        </option>
                      ))}

                    </select>

                  </div>


                  <div className="dashboard-rendezvous-header">

                    <button
                      type="button"
                      className="dashboard-rendezvous-sort"
                      onClick={() => changeRendezvousSort("type")}
                    >
                      Type

                      {rendezvousSort.field === "type" && (
                        <span className="dashboard-rendezvous-sort-icon">
                          {rendezvousSort.direction === "asc"
                            ? "▲"
                            : "▼"}
                        </span>
                      )}
                    </button>


                    <button
                      type="button"
                      className="dashboard-rendezvous-sort"
                      onClick={() => changeRendezvousSort("date")}
                    >
                      Date

                      {rendezvousSort.field === "date" && (
                        <span className="dashboard-rendezvous-sort-icon">
                          {rendezvousSort.direction === "asc"
                            ? "▲"
                            : "▼"}
                        </span>
                      )}
                    </button>


                    <div>Informations</div>

                  </div>

                  {rendezvousTries.map(item => (
                    <RendezvousRow
                      key={item.key}
                      item={item}
                      onInfo={openRendezvousInfo}
                      onParticipation={setSelectedConcert}
                    />
                  ))}

                </div>

              )}
          </div>
        )
        }
      </section >

      {selectedRendezvous && (
        <div
          className="dashboard-modal-overlay"
          onClick={closeRendezvousInfo}
        >
          <div
            className="dashboard-modal"
            onClick={event => event.stopPropagation()}
          >

            <button
              type="button"
              className="dashboard-modal-close"
              onClick={closeRendezvousInfo}
            >
              ×
            </button>


            {/* =========================================
          POPUP LIEU
      ========================================= */}

            {selectedRendezvousInfoType === "lieu" && (
              <>
                <h3>
                  {selectedRendezvous.lieu?.nom}
                </h3>

                {selectedRendezvous.lieu && (
                  <div className="dashboard-modal-lieu">

                    <div>
                      {selectedRendezvous.lieu.rue}
                    </div>

                    <div>
                      {selectedRendezvous.lieu.code_postale}{" "}
                      {selectedRendezvous.lieu.ville}
                    </div>

                    {selectedRendezvous.lieu.description && (
                      <div className="dashboard-modal-lieu-description">
                        {selectedRendezvous.lieu.description}
                      </div>
                    )}

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        [
                          selectedRendezvous.lieu.nom,
                          selectedRendezvous.lieu.rue,
                          selectedRendezvous.lieu.code_postale,
                          selectedRendezvous.lieu.ville
                        ]
                          .filter(Boolean)
                          .join(", ")
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dashboard-modal-map-button"
                    >
                      <span className="icon icon-location"></span>
                      Voir sur Google Maps
                    </a>

                  </div>
                )}
              </>
            )}


            {/* =========================================
          POPUP INFORMATIONS
      ========================================= */}

            {selectedRendezvousInfoType === "description" && (
              <>
                <h3>
                  {selectedRendezvous.typeLibelle}
                </h3>

                <div className="dashboard-modal-description">
                  {selectedRendezvous.description}
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {
        selectedConcert && (
          <div
            className="dashboard-modal-overlay"
            onClick={() => setSelectedConcert(null)}
          >
            <div
              className="dashboard-modal"
              onClick={event => event.stopPropagation()}
            >

              <button
                type="button"
                className="dashboard-modal-close"
                onClick={() => setSelectedConcert(null)}
              >
                ×
              </button>

              <h3>
                {selectedConcert.titre}
              </h3>

              <ConcertParticipation
                concert={selectedConcert}
                onParticipationChange={(concertId, participe) => {
                  setRendezvous(current =>
                    current.map(item =>
                      item.id === concertId
                        ? {
                          ...item,
                          participation: participe
                        }
                        : item
                    )
                  );

                  setSelectedConcert(null);
                }}
              />

            </div>
          </div>
        )
      }
    </div >
  );
}