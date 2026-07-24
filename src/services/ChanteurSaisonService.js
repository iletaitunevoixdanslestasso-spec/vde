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
import { ChanteurRepository } from "../repositories/ChanteurRepository";
import { BaseResponse } from "../core/framework/BaseResponse";
import { ChanteurSaisonRepository } from "../repositories/ChanteurSaisonRepository";


export class ChanteurSaisonService extends BaseService {

    constructor(repository, validator, mapper) {
        super(repository, validator, mapper);
        this.chanteurRepository = new ChanteurRepository('chanteurs');
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

        const { data: chanteurs, error } =
            await this.chanteurRepository.findAllAndSaison(saisonId);

        if (error) {
            return BaseResponse.error([], error.message);
        }

        const disponibles = chanteurs.filter(chanteur =>
            chanteur.saison_chanteurs.length === 0 ||
            chanteur.saison_chanteurs.every(sc => sc.deleted_at !== null)
        );

        return BaseResponse.success(disponibles);
    }

    async save(data) {

        if (this.validator) {
            const validation = this.validator.validate(data);

            if (!validation.valid) {
                return BaseResponse.error(validation.errors);
            }
        } else {
            alert("pas de validateuir")
            return
        }


        return this.addChanteur(
            data.chanteur_id
        );
    }
    /**
     * Ajout d'un chanteur dans une saison
     */
    async addChanteur(chanteurId) {
        const saisonId = this.context.saisonId;

        console.log("chanteurId", chanteurId)
        console.log("saisonId", saisonId)
        const { data: exists, error: existsError } =
            await this.repository.exists(
                saisonId,
                chanteurId
            );
        console.log(exists)
        console.log(existsError)

        if (exists) {
            return BaseResponse.error(
                [],
                "Ce chanteur est déjà associé à cette saison",
                {
                    action: "reactivateChanteurSaison",
                    chanteurId,
                    saisonId
                }
            );
        }


        const { data, error } =
            await this.repository.insert({
                saison_id: saisonId,
                chanteur_id: chanteurId
            });


        if (error) {
            return BaseResponse.error([], error.message);
        }


        return BaseResponse.success(data);
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
    async reactivate(chanteurId, saison_id) {

        return this.repository.updateByCriteria(
            {
                saison_id: saison_id,
                chanteur_id: chanteurId
            },
            {
                deleted_at: null
            }
        );
    }
    async setEtat(id, etat) {

        return this.repository.update(
            id,
            {
                etat: etat
            }
        );
    }
}