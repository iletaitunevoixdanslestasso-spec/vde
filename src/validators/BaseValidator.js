export class BaseValidator {
    constructor(columns = []) {
        this.columns = columns;
        this.errors = [];
    }
    validate(entity) {
        this.errors = [];
        console.error(entity)
        console.error(this.columns)
        this.columns
            .filter(c => c.required)
            .forEach(c => {
                console.error(c)
                const value = entity[c.field];

                if (
                    value === undefined ||
                    value === null ||
                    value === ""
                ) {
                    this.addError(
                        c.field,
                        `${c.header} obligatoire`
                    );
                }
            });

        return this.result();
    }

    addError(field, message) {
        this.errors.push({ field, message });
    }

    isValid() {
        return this.errors.length === 0;
    }

    result() {
        return {
            valid: this.isValid(),
            errors: this.errors
        };
    }
}