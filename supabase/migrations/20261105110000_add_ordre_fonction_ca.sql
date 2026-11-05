-- Ordre d'affichage des fonctions du conseil d'administration.
BEGIN;

ALTER TABLE public.referentiel_fonction_ca
    ADD COLUMN ordre integer NOT NULL DEFAULT 1000,
    ADD CONSTRAINT referentiel_fonction_ca_ordre_non_negatif
        CHECK (ordre >= 0);

-- Les fonctions créées ultérieurement se placent par défaut après celles-ci.
UPDATE public.referentiel_fonction_ca
SET ordre = CASE lower(btrim(libelle))
    WHEN 'président' THEN 1
    WHEN 'secrétaire' THEN 2
    WHEN 'trésorier' THEN 3
END
WHERE lower(btrim(libelle)) IN ('président', 'secrétaire', 'trésorier');

-- La colonne est ajoutée à la fin pour conserver les dépendances de la vue.
CREATE OR REPLACE VIEW public.ca_saison
WITH (security_invoker = true)
AS
SELECT
    sc.saison_id,
    s.nom AS saison,
    sc.fonction_ca_id,
    f.libelle AS fonction,
    sc.chanteur_id,
    c.nom,
    c.prenom,
    f.ordre AS ordre
FROM public.saison_chanteurs AS sc
JOIN public.saisons AS s ON s.id = sc.saison_id
JOIN public.chanteurs AS c ON c.id = sc.chanteur_id
JOIN public.referentiel_fonction_ca AS f ON f.id = sc.fonction_ca_id
WHERE sc.deleted_at IS NULL
    AND s.deleted_at IS NULL
    AND c.deleted_at IS NULL;

COMMENT ON COLUMN public.referentiel_fonction_ca.ordre IS
    'Ordre croissant d''affichage dans le trombinoscope du CA. Les égalités sont autorisées.';

COMMIT;
