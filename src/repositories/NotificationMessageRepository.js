import { invokeEdgeFunction } from "./EdgeFunctionRepository";

export class NotificationMessageRepository {
    appelerChanteur(token, action, details = {}) {
        return invokeEdgeFunction("notifications", { ...details, token, action }, "Impossible de charger vos notifications.");
    }
    lister(token, page, pageSize) {
        return this.appelerChanteur(token, "list", { page, page_size: pageSize });
    }
    compterNonLus(token) {
        return this.appelerChanteur(token, "count");
    }
    definirLecture(token, notificationId, lu) {
        return this.appelerChanteur(token, "read", { notification_id: notificationId, lu });
    }
    listerAdmin(page, pageSize) {
        return invokeEdgeFunction("notifications-admin", { page, page_size: pageSize }, "Impossible de charger l'historique des messages.");
    }
}

export const notificationMessageRepository = new NotificationMessageRepository();
