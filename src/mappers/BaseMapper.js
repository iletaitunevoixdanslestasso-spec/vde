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
            if(column.mapped!== false)
                result[column.field] = entity[column.field];
        });

        return result;
    }

}