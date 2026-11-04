import { pushAdminRepository } from "../repositories/PushAdminRepository";

const MAX_TITRE = 80;
const MAX_MESSAGE = 500;

class PushAdminService {
  valider(titre, message) {
    const titreNettoye = titre.trim();
    const messageNettoye = message.trim();

    if (!titreNettoye || titreNettoye.length > MAX_TITRE) {
      throw new Error(`Le titre doit contenir entre 1 et ${MAX_TITRE} caractères.`);
    }
    if (!messageNettoye || messageNettoye.length > MAX_MESSAGE) {
      throw new Error(`Le message doit contenir entre 1 et ${MAX_MESSAGE} caractères.`);
    }

    return { titre: titreNettoye, message: messageNettoye };
  }

  async simuler(titre, message) {
    const notification = this.valider(titre, message);
    const result = await pushAdminRepository.executer({
      cible: "tous",
      simulation: true,
      ...notification,
    });
    if (result.success !== true || result.simulation !== true) {
      throw new Error(result.error || "La simulation n'a pas abouti.");
    }
    return result;
  }

  async envoyer(titre, message) {
    const notification = this.valider(titre, message);
    return pushAdminRepository.executer({
      cible: "tous",
      simulation: false,
      confirmation: "ENVOYER_A_TOUS",
      ...notification,
    });
  }
}

export const pushAdminService = new PushAdminService();
