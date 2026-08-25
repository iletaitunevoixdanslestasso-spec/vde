INSERT INTO public.repetition (
    rendezvous_id,
    repetition_type_id,
    description
)
VALUES
    (
        'dc9f7914-f378-4e4a-9c2d-ccc5ab03a9b8'
        '9322593d-5c03-448d-84f7-fa6fd1920e3c',
        'Les répétitions sont les mardis'
    ),
INSERT INTO public.rendezvous_type (
    libelle,
    code,
    description
)
VALUES
    (
        'Répétition',
        'repet',
        'Les répétitions sont les mardis'
    ),
    (
        'Concert',
        'concert',
        'Youpi un concert'
    ),
    (
        'Regroupement',
        'regroup',
        'Extra chorale'
    );
-- ============================================================
-- TABLE : lieux
-- ============================================================

CREATE TABLE public.lieux (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    rue TEXT,
    ville TEXT,
    code_postale TEXT,
    description TEXT,
    geolocalisation TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);


-- ============================================================
-- INDEX
-- ============================================================

CREATE INDEX idx_lieux_ville
    ON public.lieux(ville);

CREATE INDEX idx_lieux_deleted_at
    ON public.lieux(deleted_at);


-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.lieux ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saison_rendezvous
ADD COLUMN deleted_at timestamptz NULL;

-- Lecture des lieux non supprimés
CREATE POLICY "Lieux visibles"
ON public.lieux
FOR SELECT
USING (deleted_at IS NULL);


-- Création
CREATE POLICY "Lieux création"
ON public.lieux
FOR INSERT
WITH CHECK (true);


-- Modification
CREATE POLICY "Lieux modification"
ON public.lieux
FOR UPDATE
USING (true)
WITH CHECK (true);


-- Suppression
CREATE POLICY "Lieux suppression"
ON public.lieux
FOR DELETE
USING (true);


-- ============================================================
-- TRIGGER updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS set_lieux_updated_at
ON public.lieux;

CREATE TRIGGER set_lieux_updated_at
BEFORE UPDATE ON public.lieux
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();



########################################################################################################
-- suppression de la fonction
drop function if exists public.get_mon_profil(text);

CREATE OR REPLACE FUNCTION public.get_mon_profil(p_token text)
 RETURNS 
 TABLE(id
uuid, nom text, prenom text, email text, telephone text, created_at
timestamp without time zone, updated_at timestamp without time zone,
deleted_at timestamp without time zone, saison_id uuid, groupe_id uuid,
pupitre_id uuid, droit_image text, droit_image_workflow integer,
stop_relance_dai boolean, stop_relance_pupitre boolean, gnom text, gdescription text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$BEGIN

    RETURN QUERY

    SELECT
        c.id,
        c.nom,
        c.prenom,
        c.email,
        c.telephone,
        c.created_at,
        c.updated_at,
        c.deleted_at,
        sc.saison_id,
        sc.groupe_id,
        scp.pupitre_id,
        c.droit_image,
        c.droit_image_workflow,
        c.stop_relance_dai,
        c.stop_relance_pupitre,
        g.nom as gnom,
        g.description as gdescription

    FROM acces a

    INNER JOIN saison_chanteurs sc
        ON sc.id = a.saison_chanteur_id

    INNER JOIN chanteurs c
        ON c.id = sc.chanteur_id

    INNER JOIN groupes g
        ON g.id = sc.groupe_id

    LEFT JOIN saison_chanteur_pupitres scp
        ON scp.saison_chanteur_id = sc.id
        AND scp.principal = true
        AND scp.chanson_id IS NULL
        AND scp.deleted_at IS NULL

    WHERE a.token = p_token
      AND a.actif = true
      AND a.deleted_at IS NULL
      AND sc.deleted_at IS NULL;

END;$function$

########################################################################################################
########################################################################################################
########################################################################################################
-- suppression de la fonction
drop function if exists public.update_stop_relance_pupitre(text);
########################################################################################################
CREATE OR REPLACE FUNCTION public.update_stop_relance_pupitre(
    p_token text,
    p_stop_relance_pupitre boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN

    UPDATE chanteurs c
    SET
        stop_relance_pupitre = p_stop_relance_pupitre,
        updated_at = now()
    FROM acces a
    INNER JOIN saison_chanteurs sc
        ON sc.id = a.saison_chanteur_id
    WHERE c.id = sc.chanteur_id
      AND a.token = p_token
      AND a.actif = true
      AND a.deleted_at IS NULL
      AND sc.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    RETURN true;

END;
$function$;

########################################################################################################
########################################################################################################
########################################################################################################