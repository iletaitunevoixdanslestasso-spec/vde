import { pushAdminRepository } from "../repositories/PushAdminRepository";
import { SaisonRepository } from "../repositories/SaisonRepository";
import { SaisonService } from "./SaisonService";
import { SaisonChanteurService } from "./SaisonChanteurService";

const MAX_TITRE = 80;
const MAX_MESSAGE = 500;
const MAX_DESTINATAIRES = 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PushAdminService {
  constructor({
    repository = pushAdminRepository,
    saisonService = new SaisonService(new SaisonRepository()),
    saisonChanteurService = new SaisonChanteurService()
  } = {}) {
    this.repository = repository;
    this.saisonService = saisonService;
    this.saisonChanteurService = saisonChanteurService;
  }

  async getDestinataires() {
    const saison = await this.saisonService.getActive();
    if (!saison.success) throw new Error(saison.message || "Impossible de déterminer la saison active.");
    if (!saison.data?.id) throw new Error("Aucune saison active : aucun destinataire disponible.");
    const chanteurs = await this.saisonChanteurService.getDestinataires(saison.data.id);
    if (!chanteurs.success) throw new Error(chanteurs.message || "Impossible de charger les chanteurs de la saison active.");
    return { saison: { id: saison.data.id, nom: saison.data.nom }, chanteurs: chanteurs.data };
  }

  valider(titre, message) {
    const titreNettoye = typeof titre === "string" ? titre.trim() : "";
    const messageNettoye = typeof message === "string" ? message.trim() : "";

    if (!titreNettoye || titreNettoye.length > MAX_TITRE) {
      throw new Error(`Le titre doit contenir entre 1 et ${MAX_TITRE} caractères.`);
    }
    if (!messageNettoye || messageNettoye.length > MAX_MESSAGE) {
      throw new Error(`Le message doit contenir entre 1 et ${MAX_MESSAGE} caractères.`);
    }
    return { titre: titreNettoye, message: messageNettoye };
  }

  preparerSelection(titre, message, chanteurIds, saisonId) {
    const notification = this.valider(titre, message);
    if (typeof saisonId !== "string" || !UUID.test(saisonId)) {
      throw new Error("Rechargez les destinataires de la saison active.");
    }
    if (!Array.isArray(chanteurIds) || !chanteurIds.length) {
      throw new Error("Sélectionnez au moins un chanteur.");
    }
    if (chanteurIds.length > MAX_DESTINATAIRES) {
      throw new Error(`Sélection limitée à ${MAX_DESTINATAIRES} chanteurs par envoi.`);
    }
    if (chanteurIds.some(id => typeof id !== "string" || !UUID.test(id))) {
      throw new Error("La sélection contient un chanteur invalide.");
    }
    return {
      ...notification,
      cible: "selection",
      saison_id: saisonId.toLowerCase(),
      chanteur_ids: [...new Set(chanteurIds.map(id => id.toLowerCase()))]
    };
  }

  async simuler(titre, message, chanteurIds, saisonId) {
    const selection = this.preparerSelection(titre, message, chanteurIds, saisonId);
    const result = await this.repository.executer({ ...selection, simulation: true });
    if (result.success !== true || result.simulation !== true) {
      throw new Error(result.error || "La simulation n'a pas abouti.");
    }
    return result;
  }

  async envoyer(titre, message, chanteurIds, saisonId) {
    const selection = this.preparerSelection(titre, message, chanteurIds, saisonId);
    const result = await this.repository.executer({
      ...selection,
      simulation: false,
      confirmation: "ENVOYER_LA_SELECTION"
    });
    // Un résultat partiel contient des compteurs exploitables ; une réponse
    // d'erreur sans bilan ne doit jamais être présentée comme un envoi terminé.
    if (typeof result.acceptes !== "number" || typeof result.echecs !== "number") {
      throw new Error(result.error || "Le service Push n'a pas renvoyé de bilan d'envoi.");
    }
    return result;
  }
}

export const pushAdminService = new PushAdminService();
