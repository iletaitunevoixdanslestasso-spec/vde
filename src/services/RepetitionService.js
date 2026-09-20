import { BaseResponse } from "../core/framework/BaseResponse";
import { RendezvouRepository } from "../repositories/RendezvouRepository";
import { RepetitionstypeRepository } from "../repositories/RepetitionstypeRepository";
import { BaseService } from "./BaseService";


export class RepetitionService extends BaseService {

    constructor(repository, validator, mapper) {
        super(repository, validator, mapper);
        this.repetitionstypeRepository = new RepetitionstypeRepository('repetitions_type');
        this.rendezvousRepository = new RendezvouRepository('rendezvous');
    }
    async getForDashboard(saisonId) {

        const { data, error } =
            await this.repository.findBySaison(saisonId, new Date().toISOString().split("T")[0]);

        console.log(data)
        if (error) {
            return BaseResponse.error([], error.message);
        }


        return BaseResponse.success(
            data
        );
    }
    // le system appel le service.getALl de l'entite pour afficher la liste des entites
    // si je veux modifier la reponse il faut surcharger cette methode
    async getAll() {

        const saisonId = this.context.saisonId;
        const { data, error } = await this.repository.findBySaison(saisonId);
        if (error) {
            return {
                success: false,
                errors: error
            };
        }
        // // j'enlève des lignes de la able liaison les lignes dontle referentiel est null
        // const filteredData = data.filter(item => item.chansons !== null);

        data.sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );



        return {
            success: true,
            data
        };

        return {
            success: true,
            data: filteredData
        };
        // return this.repository.findBySaison(saisonId);

    }

    async findLieux() {

        return this.rendezvousRepository.findLieux();

    }
    async getAvailableType(saisonId) {

        const { data, error } =
            await this.repetitionstypeRepository.findAll();

        if (error) {
            return BaseResponse.error([], error.message);
        }

        // const disponibles = chansons.filter(chanson =>
        //     chanson.saison_chansons.length === 0 ||
        //     chanson.saison_chansons.every(sc => sc.deleted_at !== null)
        // );
        console.log(data)
        const baserReponse = BaseResponse.success(data);
        console.log(baserReponse)
        return BaseResponse.success(data);
    }

    async save_old(entity) {
        console.log(entity)
        const { data: rendezvous, error } =
            await this.rendezvousRepository.findTypeRepetition();

        if (error) {
            return BaseResponse.error([], error.message);
        }

        const entityToSave = {
            ...entity,
            rendezvous_id: rendezvous.id,
            saison_id: this.context.saisonId
        };

        return super.save(entityToSave);
    }

    async save(form) {

        console.log(
            "RepetitionService.save",
            form
        );


        /*
         * =========================================================
         * RECUPERATION DU RENDEZ-VOUS "REPETITION"
         * =========================================================
         */

        const { data: rendezvous, error } =
            await this.rendezvousRepository.findTypeRepetition();

        if (error) {
            return BaseResponse.error(
                [],
                error.message
            );
        }

        console.log(
            "rendezvous repetition",
            rendezvous
        );


        /*
         * =========================================================
         * GESTION DU LIEU
         * =========================================================
         */

        let lieuId = form.lieu_id || null;


        /*
         * Nouveau lieu :
         * on crée d'abord le lieu
         */
        if (form.lieu_mode === "nouveau") {

            const lieu =
                await this.rendezvousRepository.createLieu({
                    nom: form.lieu_nom,
                    rue: form.lieu_rue,
                    ville: form.lieu_ville,
                    code_postale: form.lieu_code_postale,
                    description: form.lieu_description
                });

            lieuId = lieu.id;
        }


        console.log(
            "lieuId",
            lieuId
        );


        /*
         * =========================================================
         * ASSOCIATION DU LIEU AU RENDEZ-VOUS
         * =========================================================
         *
         * Le lieu appartient au rendez-vous générique
         * "Répétition chorale", PAS à la répétition.
         */

        if (lieuId) {

            await this.rendezvousRepository.updateLieu(
                rendezvous.id,
                lieuId
            );
        }


        /*
         * =========================================================
         * CREATION / MODIFICATION DE LA REPETITION
         * =========================================================
         *
         * PAS DE lieu_id ici.
         */

        const entityToSave = {

            id: form.id || null,

            date: form.date,

            repetitions_type_id:
                form.repetitions_type_id,

            accompagne:
                form.accompagne,

            description:
                form.description,

            rendezvous_id:
                rendezvous.id,

            saison_id:
                this.context.saisonId
        };


        console.log(
            "RepetitionService.save entityToSave",
            entityToSave
        );


        return super.save(
            entityToSave
        );
    }

    async findDuJourPourChanteur(saisonId, saisonChanteurId) {
        return this.repository.findDuJourPourChanteur(
            saisonId,
            saisonChanteurId
        );
    }
    async saveParticipation(
        token,
        saisonChanteurId,
        repetitionId,
        participe
    ) {

        return this.repository.saveParticipation(
            token,
            saisonChanteurId,
            repetitionId,
            participe
        );
    }

    async getMesRepetitions(
        saisonId,
        saisonChanteurId
    ) {

        const [
            repetitions,
            participations
        ] = await Promise.all([

            this.repository.findBySaison(
                saisonId
            ),

            this.repository.findParticipationsBySaisonChanteur(
                saisonId,
                saisonChanteurId
            )
        ]);


        if (repetitions.error) {
            return BaseResponse.error(
                [],
                repetitions.error.message
            );
        }

        if (participations.error) {
            return BaseResponse.error(
                [],
                participations.error.message
            );
        }


        const data = repetitions.data.map(
            repetition => {

                const participation =
                    participations.data.find(
                        item =>
                            item.repetition_id === repetition.id
                    );

                return {
                    ...repetition,

                    participation:
                        participation
                            ? participation.participe
                            : null
                };
            }
        );


        data.sort(
            (a, b) =>
                new Date(a.date) -
                new Date(b.date)
        );


        return BaseResponse.success(data);
    }

}
