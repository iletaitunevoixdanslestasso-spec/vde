import SrcPhotoSvg from "./photos/SrcPhotoSvg";

/** Avatar SVG pour plan de chœur (couleurs de groupe et pupitre préservées). */
export default function AvatarChanteurSvg({
    photoUrl = null,
    couleurPupitre = "#64748b",
    couleurGroupe = "#64748b"
}) {
    return (
        <g className="svg-chanteur-avatar">
            <circle cx="0" cy="0" r="13" fill="#f8fafc" />
            <SrcPhotoSvg url={photoUrl} rayon={13}>
                <>
                    <circle cx="0" cy="-5" r="4.5" fill={couleurGroupe} />
                    <path
                        d="M-9 10 C-9 3 -5 0 0 0 C5 0 9 3 9 10"
                        fill={couleurGroupe}
                    />
                </>
            </SrcPhotoSvg>
            <circle
                cx="0" cy="0" r="15" fill="none"
                stroke={couleurGroupe} strokeWidth="2.5"
            />
            <circle
                cx="0" cy="0" r="18.5" fill="none"
                stroke={couleurPupitre} strokeWidth="3"
            />
        </g>
    );
}
