import { BaseValidator } from "./BaseValidator";

export class ReferentielFonctionCaValidator extends BaseValidator {
    validate(entity) {
        super.validate(entity);

        // Un ordre absent lors d'une modification conserve la valeur enregistrée.
        if (entity.ordre !== undefined) {
            const ordre = typeof entity.ordre === "number" ||
                (typeof entity.ordre === "string" && entity.ordre.trim() !== "")
                ? Number(entity.ordre)
                : NaN;

            if (!Number.isInteger(ordre) || ordre < 0 || ordre > 2147483647) {
                this.addError(
                    "ordre",
                    "L’ordre doit être un entier compris entre 0 et 2147483647."
                );
            }
        }

        return this.result();
    }
}
