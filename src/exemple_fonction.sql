
########################################################################################################
-- suppression de la fonction
drop function if exists public.get_mon_profil(text);
########################################################################################################
CREATE OR REPLACE FUNCTION public.get_mon_profil(p_token text)
 RETURNS TABLE(id uuid, nom text, prenom text, email text, telephone text, created_at timestamp without time zone, updated_at timestamp without time zone, deleted_at timestamp without time zone, saison_id uuid, 
 groupe_id uuid, pupitre_id uuid, droit_image text, droit_image_workflow integer, stop_relance_dai boolean, stop_relance_pupitre boolean)
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
        c.stop_relance_pupitre

    FROM acces a

    INNER JOIN saison_chanteurs sc
        ON sc.id = a.saison_chanteur_id

    INNER JOIN chanteurs c
        ON c.id = sc.chanteur_id

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