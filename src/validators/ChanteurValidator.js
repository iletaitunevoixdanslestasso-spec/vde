import { BaseValidator } from "./BaseValidator";

export class ChanteurValidator extends BaseValidator {

    validate(chanteur) {
        console.error(chanteur)
        return super.validate(chanteur);

        // validations spécifiques
        // ex : email valide
        // ex : téléphone français

        return this.errors.length === 0;

        this.errors = [];

        if (!chanteur.nom) {
            this.addError("nom", "Nom obligatoire");
        }

        if (!chanteur.prenom) {
            this.addError("prenom", "Prénom obligatoire");
        }
        if (!chanteur.email) {
            this.addError("email", "E-mail obligatoire");
        }

        if (!chanteur.telephone) {
            this.addError("telephone", "Téléphone obligatoire");
        }


        return this.result();
    }
}