// Responsabilités :

// récupérer les chanteurs d'une saison
// ajouter un chanteur à une saison
// supprimer l'association
/**
 * Son rôle :

porter la logique métier
ne jamais appeler Supabase directement
utiliser les repositories

On va avoir besoin de :

SaisonChanteurRepository
ChanteurRepository
 */
import { BaseService } from "./BaseService";
import { SaisonChanteurRepository } from "../repositories/SaisonChanteurRepository";
import { ChanteurRepository } from "../repositories/ChanteurRepository";
import { BaseResponse } from "../core/framework/BaseResponse";
import { SaisonChanteursValidator } from "../validators/SaisonChanteursValidator";

const validator = new SaisonChanteursValidator();
export class SaisonChanteurService extends BaseService {

    constructor() {

        super(
            new SaisonChanteurRepository(),
            validator
        );

        this.chanteurRepository = new ChanteurRepository();
    }



    async getAll() {

        const saisonId = this.context.saisonId;
        const { data, error } = await this.repository.findBySaison(saisonId);
        if (error) {
            return {
                success: false,
                errors: error
            };
        }
        console.log(data)
        data.sort((a, b) =>
            a.chanteurs.nom.localeCompare(b.chanteurs.nom)
        );

        return {
            success: true,
            data
        };
        // return this.repository.findBySaison(saisonId);

    }

    /**
     * Liste les chanteurs d'une saison
     */
    async getBySaison(saisonId) {

        const { data, error } =
            await this.repository.findBySaison(saisonId);


        if (error) {
            return BaseResponse.error([], error.message);
        }


        return BaseResponse.success(
            data.map(item => ({
                id: item.id,
                chanteur_id: item.chanteur_id,
                saison_id: item.saison_id,
                chanteur: item.chanteurs
            }))
        );
    }



    /**
     * Liste des chanteurs pouvant être ajoutés
     */
    async getAvailableChanteurs(saisonId) {


        // 1 - tous les chanteurs actifs
        const {
            data: chanteurs,
            error: errorChanteurs
        } = await this.chanteurRepository.findAll();


        if (errorChanteurs) {
            return BaseResponse.error([], errorChanteurs.message);
        }


        // 2 - chanteurs déjà dans la saison
        const {
            data: existants,
            error: errorExistants
        } = await this.repository.findBySaison(saisonId);


        if (errorExistants) {
            return BaseResponse.error([], errorExistants.message);
        }


        const idsExistants = existants.map(
            item => item.chanteur_id
        );


        // 3 - différence
        const disponibles = chanteurs
            .filter(
                chanteur =>
                    !idsExistants.includes(chanteur.id)
            )
            .sort((a, b) =>
                a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" })
            );

        return BaseResponse.success(disponibles);
    }


    async save(data) {
        console.log(data)
        if (this.validator) {
            const validation = this.validator.validate(data);

            if (!validation.valid) {
                return BaseResponse.error(validation.errors);
            }
        }

        // ✏️ Modification
        if (data.id) {
            return this.repository.update(
                data.id,
                {
                    groupe_id: data.groupe_id
                }
            );
        }

        // ➕ Création
        return this.addChanteur(
            data.chanteur_id
        );
    }
    /**
     * Ajout d'un chanteur dans une saison
     */
    async addChanteur(chanteurId) {
        console.log("chanteurId", chanteurId);
        if (this.validator) {
            const validation = this.validator.validate(chanteurId);
            console.log("validation", validation);
            if (!validation.valid) {
                return BaseResponse.error(validation.errors);
            }
        }
        const saisonId = this.context.saisonId;


        console.log(saisonId, chanteurId)
        const { data: exists } =
            await this.repository.exists(
                saisonId,
                chanteurId
            );


        if (exists) {
            return BaseResponse.error(
                [],
                "Ce chanteur est déjà associé à cette saison"
            );
        }

        return await this.insert({
            saison_id: saisonId,
            chanteur_id: chanteurId
        });
        //Ton insert() fait déjà le traitement métier. Il ne faut pas l'encapsuler une deuxième fois.

        const { data, error } =
            await this.insert({
                saison_id: saisonId,
                chanteur_id: chanteurId
            });


        if (error) {
            return BaseResponse.error([], error.message);
        }


        return BaseResponse.success(data);
    }

    async insert(data) {
        console.log(data)
        const result = await this.repository.insert(data);

        if (result.error?.code === "23505") {
            return BaseResponse.error(
                [],
                "Ce chanteur est déjà associé à cette saison. Voulez-vous le réactiver ?"
            );
        }

        console.log(result)
        if (result.error) {
            return BaseResponse.error(
                [],
                result.error.message
            );
        }
        BaseResponse.success(result.data)
        console.log(BaseResponse)
        return BaseResponse.success(result.data);
    }

    /**
     * Retrait d'un chanteur d'une saison
     */
    async removeChanteur(id) {

        const { error } =
            await this.repository.remove(id);


        if (error) {
            return BaseResponse.error([], error.message);
        }


        return BaseResponse.success(null);
    }

}