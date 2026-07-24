import { Navigate } from "react-router-dom";
import { BaseController } from "./BaseController";


export class ChansonController extends BaseController {

    constructor(service) {
        super(service);
    }
    
    managePupitres(chanson, load) {

        // window.location.href =
        //     `/admin/saisons/${saison.nom}/chanteurs`;
        console.log(
            "ChansonController.managePupitres",
            chanson
        );

        return (`/admin//chanson/${chanson.titre}/pupitres`);

        return (`/admin/chanson/${saison.nom}/chanteurs`);

    }

}
