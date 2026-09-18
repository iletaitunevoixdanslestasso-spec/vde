export class BaseMapper {

    constructor(columns = []) {
        this.columns = columns;
    }

    /**
     * Base de données -> Interface
     * On conserve toutes les propriétés de l'objet.
     */
    toUi(data) {
        return { ...data };
    }

    /**
     * Interface -> Base de données
     * On n'envoie que les champs métier.
     */
    toDb(entity) {

        const result = {};
        this.columns.forEach(column => {
            console.log(column)
            if (column.mapped !== false) {
                if (column.type === "number") {
                    entity[column.field] =
                        entity[column.field] === "" || entity[column.field] == null
                            ? null
                            : Number(entity[column.field]);
                }

                if (column.type === "date") {
                    console.log(entity)
                    console.log(entity[column.field])
                    let value = entity[column.field];
                    console.log(value)

                    value = value === "" || value == null
                        ? null
                        : value;
                    entity[column.field] = value
                }
                result[column.field] = entity[column.field];
            }
            console.log("result", result)
        });

        return result;
    }

}