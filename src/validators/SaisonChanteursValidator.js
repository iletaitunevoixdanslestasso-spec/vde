import { BaseValidator } from "./BaseValidator";

export class SaisonChanteursValidator extends BaseValidator {

    validate(SaisonChanteurs) {
        console.error(SaisonChanteurs)
        this.errors = [];

        if (!SaisonChanteurs.chanteur_id) {
            this.addError("chanteur_id", "chanteur obligatoire");
        }


        return this.result();
    }
}