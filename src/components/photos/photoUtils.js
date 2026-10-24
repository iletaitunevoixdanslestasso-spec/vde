/** Une URL HTTP(S) utilisable dans un <img> ou un <image> SVG. */
export function estUrlPhoto(url) {
    return typeof url === "string" && /^https?:\/\//i.test(url);
}

export function initialesPhoto(prenom, nom) {
    return (
        `${(prenom || "").trim().charAt(0)}${(nom || "").trim().charAt(0)}`
            .toLocaleUpperCase("fr") || "👤"
    );
}
