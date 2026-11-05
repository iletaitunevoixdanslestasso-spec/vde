import { notificationMessageRepository } from "../repositories/NotificationMessageRepository";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class NotificationMessageService {
    constructor(repository = notificationMessageRepository) {
        this.repository = repository;
        this.compteursEnCours = new Map();
        this.listeners = new Map();
        this.revisions = new Map();
        this.derniersCompteurs = new Map();
        this.revisionsLecture = new Map();
    }
    verifierToken(token) {
        if (typeof token !== "string" || !token.trim()) throw new Error("Votre accès chanteur est nécessaire.");
    }
    verifierPagination(page, pageSize) {
        if (!Number.isInteger(page) || page < 0 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
            throw new Error("Pagination des messages invalide.");
        }
    }
    diffuserCompteur(token, count) {
        if (!Number.isInteger(count) || count < 0) throw new Error("Compteur de notifications invalide.");
        this.revisions.set(token, (this.revisions.get(token) ?? 0) + 1);
        this.derniersCompteurs.set(token, count);
        for (const callback of this.listeners.get(token) ?? []) callback(count);
    }
    subscribe(token, callback) {
        this.verifierToken(token);
        const callbacks = this.listeners.get(token) ?? new Set();
        callbacks.add(callback);
        this.listeners.set(token, callbacks);
        return () => {
            callbacks.delete(callback);
            if (!callbacks.size) this.listeners.delete(token);
        };
    }
    async lister(token, page = 0, pageSize = 20) {
        this.verifierToken(token);
        this.verifierPagination(page, pageSize);
        const revision = this.revisionsLecture.get(token) ?? 0;
        const result = await this.repository.lister(token, page, pageSize);
        if (!Array.isArray(result.messages) || !Number.isInteger(result.total) || result.total < 0) {
            throw new Error("Liste des notifications invalide.");
        }
        if (revision !== (this.revisionsLecture.get(token) ?? 0)) {
            return { ...result, non_lus: this.derniersCompteurs.get(token) ?? result.non_lus };
        }
        this.diffuserCompteur(token, result.non_lus);
        return result;
    }
    async compterNonLus(token) {
        this.verifierToken(token);
        if (this.compteursEnCours.has(token)) return this.compteursEnCours.get(token);
        const revision = this.revisions.get(token) ?? 0;
        const pending = this.repository.compterNonLus(token).then(result => {
            // Une lecture confirmée pendant cette requête reste prioritaire sur
            // un ancien compteur revenu plus tard depuis un autre chargement.
            if (revision !== (this.revisions.get(token) ?? 0)) return this.derniersCompteurs.get(token);
            this.diffuserCompteur(token, result.non_lus);
            return result.non_lus;
        }).finally(() => {
            if (this.compteursEnCours.get(token) === pending) this.compteursEnCours.delete(token);
        });
        this.compteursEnCours.set(token, pending);
        return pending;
    }
    async definirLecture(token, notificationId, lu = true) {
        this.verifierToken(token);
        if (typeof notificationId !== "string" || !UUID.test(notificationId) || typeof lu !== "boolean") {
            throw new Error("État de lecture invalide.");
        }
        const id = notificationId.toLowerCase();
        const result = await this.repository.definirLecture(token, id, lu);
        if (result.notification_id !== id || (lu ? typeof result.lu_le !== "string" : result.lu_le !== null)) {
            throw new Error("La modification de lecture n'a pas été confirmée.");
        }
        this.revisionsLecture.set(token, (this.revisionsLecture.get(token) ?? 0) + 1);
        this.diffuserCompteur(token, result.non_lus);
        return result;
    }
    async listerAdmin(page = 0, pageSize = 20) {
        this.verifierPagination(page, pageSize);
        const result = await this.repository.listerAdmin(page, pageSize);
        if (!Array.isArray(result.messages) || !Number.isInteger(result.total) || result.total < 0) {
            throw new Error("Historique des messages invalide.");
        }
        return result;
    }
}

export const notificationMessageService = new NotificationMessageService();
