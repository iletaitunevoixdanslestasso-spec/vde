import { BrowserRouter, Routes, Route } from "react-router-dom";

import TokenGuard from "../core/auth/TokenGuard";
import AdminGuard from "../core/auth/AdminGuard";

import InvalidToken from "../pages/public/InvalidToken";

import AdminLayout from "../layouts/AdminLayout";
import ChoraleLayout from "../layouts/ChoraleLayout";
import ChanteurLayout from "../pages/chanteur/ChanteurLayout";

import DashboardChanteur from "../pages/chanteur/Dashboard";


// import DashboardAdmin from "../pages/admin/referentiels/Dashboardels/dashboard";
import { Navigate } from "react-router-dom";
import Home from "../pages/public/Home";
import Chansons from "../pages/chanteur/MesChansons";
import Concerts from "../pages/chanteur/Concerts";
import Repetitions from "../pages/chanteur/Repetitions";
import Votes from "../pages/chanteur/Votes";
// import Chanteurs from "../pages/admin/referentiels/Chanteursels/chanteurs";
import ChansonsAdmin from "../pages/Chansons";
import ConcertsAdmin from "../pages/Concerts";
import AdminLogin from "../pages/admin/referentiels/login/login";
import Dashboard from "../pages/admin/referentiels/dashboard/Dashboard";

import SaisonPage from "../pages/admin/referentiels/saisons/SaisonPage";
import ChanteurPage from "../pages/admin/referentiels/chanteurs/ChanteurPage";
import MesChansons from "../pages/chanteur/MesChansons";
import SaisonChanteursPage from "../pages/admin/referentiels/saisons/SaisonChanteursPage";
import ChansonpupitrePage from "../pages/admin/referentiels/chansons/ChansonpupitrePage";
import { SaisonProvider } from "../components/contexts/SaisonContext";
import ChanteurSaisonPage from "../pages/admin/saisons/ChanteurSaisonPage";
import ChansonPage from "../pages/admin/referentiels/chansons/ChansonPage";
import PupitrePage from "../pages/admin/referentiels/pupitre/PupitrePage";
import GroupePage from "../pages/admin/referentiels/groupe/GroupePage";
import RepetitionPage from "../pages/admin/referentiels/repetition/RepetitionPage";
import ConcertsPage from "../pages/admin/referentiels/concert/ConcertPage";
import SaisonchansonPage from "../pages/admin/referentiels/saisonchanson/SaisonchansonPage";
import ChansonsSaisonPage from "../pages/admin/saisons/ChansonsSaisonPage";
import InscriptionChanteur from "../pages/chanteur/InscriptionChanteur";
import { ChansonProvider } from "../components/contexts/ChansonContext";
import RepartitionChansonsSaisonPage from "../pages/admin/saisons/RepartitionChansonsSaisonPage";
import ChansonsChanteur from "../pages/chanteur/ChansonsChanteur";
import Profil from "../pages/chanteur/profil";
import Testdivers from "../pages/admin/Testdivers";
import ReferentielDocumentPage from "../pages/admin/referentiels/ReferentielDocument/ReferentielDocumentPage";
import ConcertSaisonPage from "../pages/admin/saisons/ConcertSaisonPage";

import { ConcertProvider } from "../components/contexts/ConcertContext";
import SaisonconcertPage from "../pages/admin/referentiels/saisonconcert/SaisonconcertPage";
import SaisonConcertChansonsPage from "../pages/admin/referentiels/SaisonConcertChanson/SaisonConcertChansonsPage";
import ConcertsChanteur from "../pages/chanteur/ConcertsChanteur";
import { ChanteurProvider } from "../components/contexts/ChanteurContext";
import LieuxPage from "../pages/admin/referentiels/Lieux/LieuxPage";
import DocumentsChanteur from "../pages/chanteur/DocumentsChanteur";
import DocumentsChanteurPage from "../pages/admin/referentiels/DocumentsChanteur/DocumentsChanteurPage";
import InvitationSaisonPage from "../pages/admin/referentiels/invitationSaison/InvitationSaisonPage";
import SaisonRepetitionChanteursPage from "../pages/admin/referentiels/SaisonConcertChanson/SaisonRepetitionChanteursPage";


export default function Router() {

    return (
        <BrowserRouter>
            <SaisonProvider>

                <Routes>

                    {/* HOME */}
                    <Route path="/" element={<Home />} />

                    {/* ERROR */}
                    <Route path="/invalid-token" element={<InvalidToken />} />

                    <Route path="test" element={<Testdivers />} />
                    {/* SITE CHORALE */}
                    <Route element={<ChoraleLayout />}>

                        {/* =========================================
                            CHANTEUR
                            ========================================= */}
                        <Route element={<TokenGuard />}>

                            <Route
                                path="/chanteur/:token"
                                element={
                                    <ChanteurProvider>
                                        <ChanteurLayout />
                                    </ChanteurProvider>}
                            >

                                <Route
                                    path="inscription"
                                    element={<InscriptionChanteur />}
                                />

                                <Route
                                    path="profil"
                                    element={<Profil />}
                                />

                                <Route
                                    index
                                    element={<DashboardChanteur />}
                                />

                                <Route
                                    path="chansons"
                                    element={<ChansonsChanteur />}
                                />

                                <Route
                                    path="concerts"
                                    element={<ConcertsChanteur />}
                                />

                                <Route
                                    path="repetitions"
                                    element={<Repetitions />}
                                />
                                <Route
                                    path="documents"
                                    element={<DocumentsChanteurPage />}
                                />

                                <Route
                                    path="votes"
                                    element={<Votes />}
                                />

                            </Route>
                        </Route>

                        {/* =========================================
                        ADMIN LOGIN
                        ========================================= */}
                        <Route
                            path="/admin/login"
                            element={<AdminLogin />}
                        />
                        {/* =========================================
                            ADMIN APP
                        ========================================= */}
                        <Route
                            path="/admin/*"
                            element={
                                <AdminGuard>
                                    <ChansonProvider>
                                        <ConcertProvider>
                                            <AdminLayout />
                                        </ConcertProvider>
                                    </ChansonProvider>
                                </AdminGuard>
                            }
                        >

                            <Route index element={<Dashboard />} />

                            <Route
                                path="test"
                                element={<Testdivers />}
                            />

                            {/* saisons programme */}
                            <Route
                                path="saison/:saison_nom/chanteurs"
                                element={<ChanteurSaisonPage />}
                            />

                            <Route
                                path="saison/:saison_nom/chansons"
                                element={<ChansonsSaisonPage />}
                            />
                            <Route
                                path="saison/:saison_nom/concerts"
                                element={<ConcertSaisonPage />}
                            />
                            <Route
                                path="saison/:saison_nom/invitations"
                                element={<InvitationSaisonPage />}
                            />
                            <Route
                                path="saison/:saison_nom/concert/:titre/chansons"
                                element={<SaisonConcertChansonsPage />}
                            />

                            <Route
                                path="saison/:saison_nom/repetition"
                                element={<RepetitionPage />}
                            />
                            <Route
                                path="saison/:saison_nom/repetition/:titre/chanteurs"
                                element={<SaisonRepetitionChanteursPage />}
                            />

                            <Route
                                path="saison/:saison_nom/:chanson_nom/repartition"
                                element={<RepartitionChansonsSaisonPage />}
                            />

                            <Route
                                path="saison/:saison_nom/groupes"
                                element={<GroupePage />}
                            />

                            {/* référentiels */}
                            <Route
                                path="saisons"
                                element={<SaisonPage />}
                            />

                            <Route
                                path="chanteurs"
                                element={<ChanteurPage />}
                            />

                            <Route
                                path=":saison_nom/chanteurs"
                                element={<SaisonChanteursPage />}
                            />

                            <Route
                                path="chansons"
                                element={<ChansonPage />}
                            />

                            <Route
                                path="chanson/:titre/pupitres"
                                element={<ChansonpupitrePage />}
                            />

                            <Route
                                path="pupitres"
                                element={<PupitrePage />}
                            />
                            <Route
                                path="lieux"
                                element={<LieuxPage />}
                            />

                            <Route
                                path="documents"
                                element={<ReferentielDocumentPage />}
                            />

                            <Route
                                path="concerts"
                                element={<ConcertsPage />}
                            />

                            <Route
                                path="repetitions"
                                element={<RepetitionPage />}
                            />

                            <Route
                                path="invitations"
                                element={<div>Invitations</div>}
                            />

                        </Route>

                    </Route>

                </Routes>
            </SaisonProvider>
        </BrowserRouter >
    );
}