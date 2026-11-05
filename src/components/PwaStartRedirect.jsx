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


function getNotificationsPath() {
    const current = /^\/chanteur\/([^/?#]+)/.exec(window.location.pathname);
    if (current) return `/chanteur/${current[1]}/notifications`;
    const token = localStorage.getItem("token");
    if (token) return `/chanteur/${encodeURIComponent(token)}/notifications`;
    const saved = getChanteurPath();
    const match = typeof saved === "string" && /^\/chanteur\/([^/?#]+)/.exec(saved);
    return match ? `/chanteur/${match[1]}/notifications` : null;
}

export default function PwaStartRedirect() {

    useEffect(() => {
        const worker = navigator.serviceWorker;
        if (!worker) return;
        const ouvrir = event => {
            if (event.data?.type !== "OPEN_NOTIFICATIONS") return;
            const path = getNotificationsPath();
            if (path) window.location.assign(path);
        };
        worker.addEventListener("message", ouvrir);
        return () => worker.removeEventListener("message", ouvrir);
    }, []);

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

        if (params.get("notifications") === "1") {
            const inbox = getNotificationsPath();
            if (inbox) {
                window.location.replace(inbox);
                return;
            }
        }

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