-- Les messages restent consultables même sans abonnement Push. La lecture
-- personnelle passe exclusivement par les Edge Functions et le token chanteur.
CREATE TABLE public.notification_messages (
    id uuid PRIMARY KEY,
    saison_id uuid NOT NULL REFERENCES public.saisons(id),
    titre text NOT NULL CHECK (char_length(btrim(titre)) BETWEEN 1 AND 80),
    contenu text NOT NULL CHECK (char_length(btrim(contenu)) BETWEEN 1 AND 500),
    auteur_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    auteur_nom text NOT NULL CHECK (char_length(btrim(auteur_nom)) BETWEEN 1 AND 320),
    created_at timestamptz NOT NULL DEFAULT now(),
    statut_push text NOT NULL DEFAULT 'en_cours'
        CHECK (statut_push IN ('en_cours', 'termine', 'partiel', 'erreur')),
    nombre_chanteurs integer NOT NULL CHECK (nombre_chanteurs BETWEEN 1 AND 1000),
    nombre_appareils integer NOT NULL CHECK (nombre_appareils BETWEEN 0 AND 200),
    nombre_sans_abonnement integer NOT NULL CHECK (nombre_sans_abonnement >= 0 AND nombre_sans_abonnement <= nombre_chanteurs),
    acceptes integer NOT NULL DEFAULT 0 CHECK (acceptes >= 0),
    echecs integer NOT NULL DEFAULT 0 CHECK (echecs >= 0),
    CHECK (acceptes + echecs <= nombre_appareils)
);

CREATE TABLE public.notification_destinataires (
    notification_id uuid NOT NULL REFERENCES public.notification_messages(id) ON DELETE CASCADE,
    chanteur_id uuid NOT NULL REFERENCES public.chanteurs(id),
    lu_le timestamptz,
    PRIMARY KEY (notification_id, chanteur_id)
);

CREATE INDEX notification_messages_date_idx ON public.notification_messages (created_at DESC, id DESC);
CREATE INDEX notification_messages_saison_idx ON public.notification_messages (saison_id);
CREATE INDEX notification_destinataires_chanteur_idx ON public.notification_destinataires (chanteur_id, notification_id);
CREATE INDEX notification_destinataires_non_lus_idx ON public.notification_destinataires (chanteur_id) WHERE lu_le IS NULL;

ALTER TABLE public.notification_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_destinataires ENABLE ROW LEVEL SECURITY;
-- Aucune politique anon/authenticated : un token de choriste n'est pas un JWT
-- Auth. Seules les fonctions serveur vérifient ce token puis isolent son ID.
REVOKE ALL ON public.notification_messages, public.notification_destinataires FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_messages, public.notification_destinataires TO service_role;

COMMENT ON TABLE public.notification_messages IS 'Historique des publications réelles, indépendant du succès des services Push.';
COMMENT ON TABLE public.notification_destinataires IS 'Destinataires figés à la publication et état de lecture partagé entre leurs appareils.';
COMMENT ON COLUMN public.notification_messages.id IS 'Identifiant d’envoi conservé par le formulaire : une nouvelle tentative ne renvoie jamais le même Push.';
COMMENT ON COLUMN public.notification_messages.auteur_nom IS 'Nom historique issu de la session Auth vérifiée côté serveur, jamais fourni par le formulaire.';

-- La même transaction fige le message et TOUS les destinataires. Le verrou
-- d'envoi sérialise les doubles clics, y compris deux Edge Functions concurrentes.
-- Les verrous de saison/inscription empêchent une invalidation entre contrôle
-- et insertion. Ils sont libérés avant tout appel au fournisseur Push.
CREATE FUNCTION public.creer_notification_message(
    p_id uuid,
    p_saison_id uuid,
    p_titre text,
    p_contenu text,
    p_auteur_id uuid,
    p_auteur_nom text,
    p_chanteur_ids uuid[],
    p_nombre_appareils integer,
    p_nombre_sans_abonnement integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_message public.notification_messages%ROWTYPE;
    v_ids uuid[];
    v_existants uuid[];
    v_actives uuid[];
    v_inscrits uuid[];
BEGIN
    SELECT array_agg(DISTINCT id ORDER BY id) INTO v_ids FROM unnest(p_chanteur_ids) AS u(id);
    IF p_id IS NULL OR v_ids IS NULL OR cardinality(v_ids) NOT BETWEEN 1 AND 1000
        OR array_position(p_chanteur_ids, NULL) IS NOT NULL THEN
        RAISE EXCEPTION 'NOTIFICATION_RECIPIENTS' USING ERRCODE = 'P0001';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
    SELECT * INTO v_message FROM public.notification_messages WHERE id = p_id;
    IF FOUND THEN
        SELECT array_agg(chanteur_id ORDER BY chanteur_id) INTO v_existants
        FROM public.notification_destinataires WHERE notification_id = p_id;
        IF v_message.saison_id IS DISTINCT FROM p_saison_id
            OR v_message.titre IS DISTINCT FROM p_titre
            OR v_message.contenu IS DISTINCT FROM p_contenu
            OR v_message.auteur_id IS DISTINCT FROM p_auteur_id
            OR v_existants IS DISTINCT FROM v_ids THEN
            RAISE EXCEPTION 'NOTIFICATION_CONFLICT' USING ERRCODE = 'P0001';
        END IF;
        RETURN jsonb_build_object('created', false, 'message', to_jsonb(v_message));
    END IF;

    LOCK TABLE public.saisons IN SHARE MODE;
    SELECT array_agg(id) INTO v_actives FROM public.saisons WHERE active IS TRUE AND deleted_at IS NULL;
    IF cardinality(v_actives) IS DISTINCT FROM 1 OR v_actives[1] IS DISTINCT FROM p_saison_id THEN
        RAISE EXCEPTION 'NOTIFICATION_SEASON' USING ERRCODE = 'P0001';
    END IF;

    -- Verrouiller les lignes avant d'agréger, sans perdre les inscriptions
    -- multiples éventuelles d'un même chanteur.
    SELECT array_agg(DISTINCT inscrit.chanteur_id ORDER BY inscrit.chanteur_id) INTO v_inscrits
    FROM (
        SELECT sc.chanteur_id FROM public.saison_chanteurs sc
        JOIN public.chanteurs c ON c.id = sc.chanteur_id
        WHERE sc.saison_id = p_saison_id AND sc.chanteur_id = ANY(v_ids)
            AND sc.deleted_at IS NULL AND c.deleted_at IS NULL
        FOR SHARE OF sc, c
    ) AS inscrit;
    IF v_inscrits IS DISTINCT FROM v_ids THEN
        RAISE EXCEPTION 'NOTIFICATION_RECIPIENTS' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.notification_messages (
        id, saison_id, titre, contenu, auteur_id, auteur_nom,
        nombre_chanteurs, nombre_appareils, nombre_sans_abonnement
    ) VALUES (
        p_id, p_saison_id, p_titre, p_contenu, p_auteur_id, p_auteur_nom,
        cardinality(v_ids), p_nombre_appareils, p_nombre_sans_abonnement
    ) RETURNING * INTO v_message;
    INSERT INTO public.notification_destinataires (notification_id, chanteur_id)
    SELECT p_id, unnest(v_ids);
    RETURN jsonb_build_object('created', true, 'message', to_jsonb(v_message));
END;
$$;

-- Les arguments auteur et destinataires ne sont jamais fiables depuis un
-- navigateur : ce RPC est réservé à la clé service_role des Edge Functions.
REVOKE ALL ON FUNCTION public.creer_notification_message(uuid, uuid, text, text, uuid, text, uuid[], integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.creer_notification_message(uuid, uuid, text, text, uuid, text, uuid[], integer, integer) TO service_role;
