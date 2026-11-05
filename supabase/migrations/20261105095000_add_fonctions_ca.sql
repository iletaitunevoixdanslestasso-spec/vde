-- Conseil d'administration : une fonction facultative par chanteur et saison.
-- PostgreSQL >= 15 / Supabase. À exécuter une seule fois sur le schéma existant.
BEGIN;

CREATE TABLE public.referentiel_fonction_ca (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    libelle text NOT NULL,
    CONSTRAINT referentiel_fonction_ca_pkey PRIMARY KEY (id),
    CONSTRAINT referentiel_fonction_ca_libelle_non_vide
        CHECK (btrim(libelle) <> '')
);

-- Interdit aussi « Président » ou « président » entouré d'espaces
-- lorsqu'une fonction « président » existe déjà.
CREATE UNIQUE INDEX referentiel_fonction_ca_libelle_unique
    ON public.referentiel_fonction_ca (lower(btrim(libelle)));

INSERT INTO public.referentiel_fonction_ca (libelle)
VALUES ('président'), ('secrétaire'), ('trésorier');

ALTER TABLE public.saison_chanteurs
    ADD COLUMN fonction_ca_id uuid NULL,
    ADD CONSTRAINT saison_chanteurs_fonction_ca_id_fkey
        FOREIGN KEY (fonction_ca_id)
        REFERENCES public.referentiel_fonction_ca (id)
        ON DELETE RESTRICT;

CREATE INDEX idx_saison_chanteurs_fonction_ca
    ON public.saison_chanteurs (fonction_ca_id)
    WHERE fonction_ca_id IS NOT NULL;

-- Même modèle d'accès que les référentiels administratifs existants :
-- les comptes Supabase authentifiés gèrent les fonctions ; aucun accès anonyme.
ALTER TABLE public.referentiel_fonction_ca ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.referentiel_fonction_ca FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE
    ON TABLE public.referentiel_fonction_ca TO authenticated, service_role;

CREATE POLICY referentiel_fonction_ca_authenticated_crud
    ON public.referentiel_fonction_ca
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Seules les affectations ayant une fonction et non supprimées sont affichées.
-- security_invoker conserve les permissions et politiques RLS des tables sources.
CREATE VIEW public.ca_saison
WITH (security_invoker = true)
AS
SELECT
    sc.saison_id,
    s.nom AS saison,
    sc.fonction_ca_id,
    f.libelle AS fonction,
    sc.chanteur_id,
    c.nom,
    c.prenom
FROM public.saison_chanteurs AS sc
JOIN public.saisons AS s ON s.id = sc.saison_id
JOIN public.chanteurs AS c ON c.id = sc.chanteur_id
JOIN public.referentiel_fonction_ca AS f ON f.id = sc.fonction_ca_id
WHERE sc.deleted_at IS NULL
    AND s.deleted_at IS NULL
    AND c.deleted_at IS NULL;

REVOKE ALL ON TABLE public.ca_saison FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.ca_saison TO authenticated, service_role;

COMMENT ON COLUMN public.saison_chanteurs.fonction_ca_id IS
    'Fonction facultative au conseil d''administration pour ce chanteur et cette saison.';

COMMENT ON VIEW public.ca_saison IS
    'Membres du conseil d''administration par saison, hors éléments supprimés.';

COMMIT;
