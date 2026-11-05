import { BaseController } from "./BaseController";
import NotificationService from "../services/NotificationService";

export class ReferentielFonctionCaController extends BaseController {
    async load(setState) {
        const result = await super.load(setState);

        if (!result.success) {
            NotificationService.error(result.message || "Impossible de charger les fonctions du CA.");
        }

        return result;
    }

    async delete(id, onSuccess, onError) {
        const result = await super.delete(id, onSuccess, onError);

        if (result.success) {
            NotificationService.success(result.message);
        } else {
            NotificationService.error(result.message || "La suppression a échoué.");
        }

        return result;
    }
}
