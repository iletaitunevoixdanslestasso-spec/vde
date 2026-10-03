import { useEffect } from "react";

const COOKIE_NAME = "pwa_chanteur_path";


function saveChanteurPath(path) {

    document.cookie =
        `${COOKIE_NAME}=${encodeURIComponent(path)};` +
        `Path=/;` +
        `Max-Age=31536000;` +
        `SameSite=Lax;` +
        `Secure`;
}


function getChanteurPath() {

    const cookies = document.cookie.split(";");

    for (const cookie of cookies) {

        const [name, ...valueParts] =
            cookie.trim().split("=");

        if (name === COOKIE_NAME) {

            return decodeURIComponent(
                valueParts.join("=")
            );
        }
    }

    return null;
}


export default function PwaStartRedirect() {

    useEffect(() => {

        const {
            pathname,
            search
        } = window.location;


        /*
         * =====================================================
         * 1. Le chanteur arrive sur son URL personnelle
         *
         * /chanteur/UUID
         *
         * On mémorise cette URL sur son appareil.
         * =====================================================
         */

        if (
            pathname.startsWith("/chanteur/") &&
            pathname !== "/chanteur/"
        ) {

            saveChanteurPath(
                pathname
            );

            return;
        }


        /*
         * =====================================================
         * 2. L'application vient d'être ouverte depuis
         *    son icône PWA
         * =====================================================
         */

        const params =
            new URLSearchParams(search);

        if (params.get("pwa") !== "1") {
            return;
        }


        /*
         * =====================================================
         * 3. Retrouver l'URL personnelle
         * =====================================================
         */

        const chanteurPath =
            getChanteurPath();


        if (!chanteurPath) {
            return;
        }


        /*
         * =====================================================
         * 4. Aller directement dans son espace chanteur
         * =====================================================
         */

        window.location.replace(
            chanteurPath
        );

    }, []);


    return null;
}