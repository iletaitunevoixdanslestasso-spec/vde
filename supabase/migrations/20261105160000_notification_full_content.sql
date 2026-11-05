-- Le contenu intégral reste dans l'historique et dans la boîte du chanteur.
-- Seul l'aperçu envoyé aux services Push est raccourci côté serveur.
-- La borne technique de 1 Mio porte sur les octets UTF-8, pas sur les caractères.
ALTER TABLE public.notification_messages
    DROP CONSTRAINT notification_messages_contenu_check,
    ADD CONSTRAINT notification_messages_contenu_check
        CHECK (char_length(btrim(contenu)) >= 1 AND octet_length(contenu) <= 1048576);

COMMENT ON COLUMN public.notification_messages.contenu IS
    'Message intégral consultable dans l’application, limité à 1 Mio UTF-8 ; le Push utilise un aperçu distinct.';
