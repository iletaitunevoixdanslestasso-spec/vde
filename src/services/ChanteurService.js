import { BaseService } from "./BaseService";
import { supabase } from "../core/supabase/client";
import { BaseResponse } from "../core/framework/BaseResponse";
import { GroupeRepository } from "../repositories/GroupeRepository";
import { PupitreRepository } from "../repositories/PupitreRepository";
import { ReferentielDocumentRepository } from "../repositories/ReferentielDocumentRepository";
import StorageService from "./StorageService";
import { DocumentTypeRepository } from "../repositories/DocumentTypeRepository";

export class ChanteurService extends BaseService {

    constructor(
        repository,
        validator = null,
        mapper = null
    ) {
        super(repository, validator, mapper);
        this.groupeRepository = new GroupeRepository("groupes");
        this.pupitreRepository = new PupitreRepository("pupitres");
        this.referentielDocumentRepository = new ReferentielDocumentRepository("referentiel_documents");
        this.documentTypeRepository = new DocumentTypeRepository("document_types");
    }


    async getAll(orderBy = "nom") {

        const result = await super.getAll(orderBy);

        console.log("CHANTEUR getAll result", result);

        if (!result.success || !result.data?.length) {
            return result;
        }

        const chanteurs = await Promise.all(
            result.data.map(async (chanteur) => {


                let droit_image_url = null;

                if (chanteur.droit_image) {

                    try {

                        droit_image_url =
                            await StorageService.createSignedUrl(
                                "chanteur-documents",
                                chanteur.droit_image,
                                3600
                            );


                    } catch (error) {

                        console.error(
                            "Erreur URL DAI chanteur",
                            error
                        );
                    }
                }

                return {
                    ...chanteur,
                    droit_image_url
                };
            })
        );



        return {
            ...result,
            data: chanteurs
        };
    }


    async getByToken(token) {

        const {
            data,
            error
        } = await this.repository.findByToken(token);

        if (error) {
            return BaseResponse.error(
                [],
                error.message
            );
        }

        const profil = Array.isArray(data)
            ? data[0]
            : data;

        if (!profil) {
            return BaseResponse.success(
                [],
                null
            );
        }

        /*
         * ----------------------------------------------------
         * Template droit à l'image
         * ----------------------------------------------------
         *
         * Le chanteur est anonyme côté Supabase Auth.
         * La récupération du template passe donc par
         * l'Edge Function qui valide le token métier
         * et génère l'URL signée.
         */

        let droit_image_url = null;

        try {

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-chanteur-droit-image`,
                {
                    method: "POST",
                    headers: {
                        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        token
                    })
                }
            );

            const templateResult = await response.json();

            if (response.ok && templateResult?.url) {

                droit_image_url =
                    templateResult.url;
            }

        } catch (error) {

            console.error(
                "Erreur récupération template droit à l'image",
                error
            );
        }
        /*
         * ----------------------------------------------------
         * Template droit à l'image TEMPLATE
         * ----------------------------------------------------
         *
         * Le chanteur est anonyme côté Supabase Auth.
         * La récupération du template passe donc par
         * l'Edge Function qui valide le token métier
         * et génère l'URL signée.
         */

        let droit_image_template_url = null;

        try {

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-chanteur-droit-image-template`,
                {
                    method: "POST",
                    headers: {
                        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        token
                    })
                }
            );

            const templateResult = await response.json();

            if (response.ok && templateResult?.url) {

                droit_image_template_url =
                    templateResult.url;
            }

        } catch (error) {

            console.error(
                "Erreur récupération template droit à l'image",
                error
            );
        }

        /*
         * ----------------------------------------------------
         * Retour du profil
         * ----------------------------------------------------
         */

        return BaseResponse.success(
            [
                {
                    ...profil,
                    droit_image_template_url,
                    droit_image_url
                }
            ],
            null
        );
    }

    async updateByToken(token, data) {

        const {
            data: result,
            error
        } = await this.repository.updateByToken(
            token,
            data
        );

        if (error) {

            return BaseResponse.error(
                [],
                error.message
            );

        }

        return BaseResponse.success(
            result,
            "Profil modifié"
        );
    }


    async setActive(id) {

        const { error } =
            await supabase.rpc(
                "set_active_saison",
                { p_id: id }
            );

        if (error) {

            return BaseResponse.error(
                [],
                error.message
            );

        }

        return BaseResponse.success(
            null,
            "Saison activée"
        );
    }
    async updateByToken(token, data) {

        const {
            data: result,
            error
        } = await this.repository.updateByToken(
            token,
            data
        );

        if (error) {

            return BaseResponse.error(
                [],
                error.message
            );

        }

        return BaseResponse.success(
            result,
            "Profil modifié"
        );
    }

    async getAvailableGroupes(saisonId) {
        const { data, error } =
            await this.groupeRepository.findBySaison(saisonId);

        if (error) {
            return BaseResponse.error([], error.message);
        }

        return BaseResponse.success(data);
    }
    async getAvailablePupitres() {

        const { data, error } =
            await this.pupitreRepository.findAll();

        if (error) {
            return BaseResponse.error([], error.message);
        }

        return BaseResponse.success(data);
    }
    async validateDroitImage(chanteurId) {

        const {
            data,
            error
        } = await this.repository.updateDroitImageWorkflow(
            chanteurId,
            2
        );

        if (error) {
            return BaseResponse.error(
                [],
                error.message
            );
        }

        return BaseResponse.success(
            data,
            "Droit à l'image validé."
        );
    }


    async rejectDroitImage(chanteurId) {

        const {
            data,
            error
        } = await this.repository.updateDroitImageWorkflow(
            chanteurId,
            3
        );

        if (error) {
            return BaseResponse.error(
                [],
                error.message
            );
        }

        return BaseResponse.success(
            data,
            "Droit à l'image refusé."
        );
    }

    async updateStopRelancePupitre(token, stopRelancePupitre) {

        const { data, error } =
            await this.repository.updateStopRelancePupitre(
                token,
                stopRelancePupitre
            );

        if (error) {
            return BaseResponse.error(
                null,
                error.message
            );
        }

        if (data !== true) {
            return BaseResponse.error(
                null,
                "Impossible de modifier le paramètre de relance pupitre."
            );
        }

        return BaseResponse.success(
            {
                stop_relance_pupitre: stopRelancePupitre
            },
            null
        );
    }
    async updateStopRelanceDai(token, stopRelanceDai) {

        const { data, error } =
            await this.repository.updateStopRelanceDai(
                token,
                stopRelanceDai
            );

        if (error) {
            return BaseResponse.error(
                null,
                error.message
            );
        }

        if (data !== true) {
            return BaseResponse.error(
                null,
                "Impossible de modifier le paramètre de relance DAI."
            );
        }

        return BaseResponse.success(
            {
                stop_relance_dai: stopRelanceDai
            },
            null
        );
    }
}