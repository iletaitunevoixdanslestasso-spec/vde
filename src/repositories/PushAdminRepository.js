import { invokeEdgeFunction } from "./EdgeFunctionRepository";

/** La session Auth est transmise par le SDK ; aucun secret privé dans React. */
class PushAdminRepository {
    executer(body) {
        return invokeEdgeFunction("push-test", body, "Impossible de contacter le service Push.");
    }
}

export const pushAdminRepository = new PushAdminRepository();
