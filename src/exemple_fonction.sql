-- suppression de la fonction
drop function if exists public.get_mon_profil(text);

-- creation de la fonction
create or replace function public.get_mon_profil(
    p_token text
)
returns table (
    id uuid,
    nom text,
    prenom text,
    email text,
    telephone text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone,
    saison_id uuid,
    groupe_id uuid,
    pupitre_id uuid,
    droit_image text,
    droit_image_workflow integer
)
language plpgsql
security definer
set search_path = public
as $function$


--  fonction modfifaibel dans linterface
begin

    return query

    select
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
        c.droit_image_workflow

    from acces a

    inner join saison_chanteurs sc
        on sc.id = a.saison_chanteur_id

    inner join chanteurs c
        on c.id = sc.chanteur_id

    left join saison_chanteur_pupitres scp
        on scp.chanteur_id = sc.chanteur_id
        and scp.saison_id = sc.saison_id
        and scp.principal = true
        and scp.chanson_id is null
        and scp.deleted_at is null

    where a.token = p_token
      and a.actif = true
      and a.deleted_at is null
      and sc.deleted_at is null;

end;

$function$;