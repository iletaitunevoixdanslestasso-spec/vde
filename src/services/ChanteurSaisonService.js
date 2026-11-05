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
import { GroupeRepository } from "../repositories/GroupeRepository";
import { ReferentielFonctionCaRepository } from "../repositories/ReferentielFonctionCaRepository";


export class ChanteurSaisonService extends BaseService {

    constructor(repository, validator, mapper) {
        super(repository, validator, mapper);
        this.chanteurRepository = new ChanteurRepository('chanteurs');
        this.groupeRepository = new GroupeRepository("groupes");
        this.fonctionCaRepository = new ReferentielFonctionCaRepository();
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
        // j'enlève des lignes de la able liaison les lignes dontle referentiel est null
        const filteredData = data.filter(item => item.chansons !== null);
        filteredData.sort((a, b) =>
            a.chanteurs.nom.localeCompare(b.chanteurs.nom)
        );

        return {
            success: true,
            data: filteredData
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
                chanteur: item.chanteurs,
                fonction_ca_id: item.fonction_ca_id,
                referentiel_fonction_ca: item.referentiel_fonction_ca
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
        }
        // Un champ absent d'une modification partielle garde sa valeur actuelle.
        const groupe = data.groupe_id === undefined
            ? {}
            : { groupe_id: data.groupe_id || null };
        const fonctionCa = data.fonction_ca_id === undefined
            ? {}
            : { fonction_ca_id: data.fonction_ca_id || null };

        if (data.id) {
            const { data: updated, error } = await this.repository.update(
                data.id,
                {
                    ...groupe,
                    ...fonctionCa
                }
            );

            if (error) {
                return BaseResponse.error([], error.message);
            }

            return BaseResponse.success(updated);
        }

        return this.addChanteur(
            data.chanteur_id,
            data.groupe_id,
            data.fonction_ca_id || null
        );
    }
    /**
     * Ajout d'un chanteur dans une saison
     */
    async addChanteur(chanteurId, groupeId, fonctionCaId = null) {

        const saisonId = this.context.saisonId;

        const { data: exists, error: existsError } =
            await this.repository.exists(
                saisonId,
                chanteurId
            );

        if (existsError) {
            return BaseResponse.error([], existsError.message);
        }

        if (exists) {
            return BaseResponse.error(
                [],
                "CII Ce chanteur est déjà associé à cette saison"
            );
        }

        const { data, error } =
            await this.repository.insert({
                saison_id: saisonId,
                chanteur_id: chanteurId,
                groupe_id: groupeId || null,
                fonction_ca_id: fonctionCaId || null
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

    async getAvailableGroupes(saisonId) {
        const { data, error } =
            await this.groupeRepository.findBySaison(saisonId);

        if (error) {
            return BaseResponse.error([], error.message);
        }

        return BaseResponse.success(data);
    }

    async getAvailableFonctionsCa() {
        const { data, error } = await this.fonctionCaRepository.findAll();

        if (error) {
            return BaseResponse.error([], error.message);
        }

        return BaseResponse.success(data);
    }
}
