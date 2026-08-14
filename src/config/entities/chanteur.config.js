import { createEntityConfig } from "./createEntityConfig";


import { ChanteurRepository } from "../../repositories/ChanteurRepository";
import { ChanteurService } from "../../services/ChanteurService";
import { ChanteurValidator } from "../../validators/ChanteurValidator";
import { ChanteurMapper } from "../../mappers/ChanteurMapper";
import { ChanteurController } from "../../controllers/ChanteurController";


const entity = "chanteurs";
const title = "🎤 les Chanteurs";
const table = "chanteurs";
const columns = [
    { field: "nom", header: "Nom", type: "text", required: true },
    { field: "prenom", header: "Prénom", type: "text", required: true },
    { field: "email", header: "Email", type: "text", required: true },
    { field: "telephone", header: "Téléphone", type: "text", required: true },


];
const actions = [
    { label: "✏️ Modifier", action: "edit" },
    { label: "⭐ Activer", action: "activate" },
    { label: "👥 Chanteurs", action: "manageChanteurs" },
    { label: "🗑 Supprimer", action: "delete" }
]

export const chanteurConfig = createEntityConfig({
    entity,
    title,
    table,
    Repository: ChanteurRepository,
    Service: ChanteurService,
    Validator: ChanteurValidator,
    Mapper: ChanteurMapper,
    Controller: ChanteurController,
    columns,
    // actions,
    defaultOrderBy: "nom",

});
