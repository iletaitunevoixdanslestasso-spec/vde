-- Run with: bash tests/notification-history-sql.sh
-- This fixture is intentionally limited to a new, isolated local test database.
-- Never apply it to Supabase or any database containing application data.
\set ON_ERROR_STOP on
\set QUIET on
DO $$ BEGIN
  IF current_database() <> 'vde_notification_history_sql_test'
      OR current_setting('vde.notification_test', true) IS DISTINCT FROM 'disposable'
      OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                 WHERE n.nspname NOT IN ('pg_catalog','information_schema')
                   AND n.nspname NOT LIKE 'pg_toast%' AND c.relkind IN ('r','p')) THEN
    RAISE EXCEPTION 'Only the empty disposable database created by notification-history-sql.sh is allowed';
  END IF;
END $$;
\o /dev/null
\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE TABLE public.saisons (id uuid PRIMARY KEY, active boolean NOT NULL DEFAULT false, deleted_at timestamptz);
CREATE TABLE public.chanteurs (id uuid PRIMARY KEY, deleted_at timestamptz);
CREATE TABLE public.saison_chanteurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saison_id uuid NOT NULL REFERENCES public.saisons(id),
  chanteur_id uuid NOT NULL REFERENCES public.chanteurs(id),
  deleted_at timestamptz
);
GRANT USAGE ON SCHEMA public, auth TO service_role;
GRANT SELECT ON public.saisons, public.chanteurs, public.saison_chanteurs, auth.users TO service_role;
INSERT INTO auth.users (id) VALUES ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
INSERT INTO public.saisons (id, active) VALUES ('10000000-0000-4000-8000-000000000001',true),('10000000-0000-4000-8000-000000000002',false);
INSERT INTO public.chanteurs (id, deleted_at) VALUES
 ('20000000-0000-4000-8000-000000000001',null),
 ('20000000-0000-4000-8000-000000000002',null),
 ('20000000-0000-4000-8000-000000000003',null),
 ('20000000-0000-4000-8000-000000000004',now()),
 ('20000000-0000-4000-8000-000000000005',null);
INSERT INTO public.saison_chanteurs (saison_id,chanteur_id,deleted_at) VALUES
 ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',null),
 ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002',null),
 ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000004',null),
 ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000005',now());

\i /tmp/vde-notification-migration.sql
\set ON_ERROR_STOP on
CREATE FUNCTION pg_temp.assert(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF; END $$;
CREATE FUNCTION pg_temp.assert_error(command text, expected_state text, expected_message text DEFAULT NULL) RETURNS void LANGUAGE plpgsql AS $$
DECLARE actual_state text; actual_message text;
BEGIN
  BEGIN EXECUTE command;
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS actual_state = RETURNED_SQLSTATE, actual_message = MESSAGE_TEXT;
  END;
  IF actual_state IS DISTINCT FROM expected_state OR (expected_message IS NOT NULL AND actual_message NOT LIKE '%' || expected_message || '%') THEN
    RAISE EXCEPTION 'FAIL: expected % / %, got % / %', expected_state, expected_message, actual_state, actual_message;
  END IF;
END $$;
CREATE FUNCTION pg_temp.publish(
  message_id uuid DEFAULT '30000000-0000-4000-8000-000000000001',
  saison uuid DEFAULT '10000000-0000-4000-8000-000000000001',
  title text DEFAULT 'Répétition',
  content text DEFAULT 'Rendez-vous à 20 h.',
  author uuid DEFAULT '00000000-0000-4000-8000-000000000001',
  author_name text DEFAULT 'Administrateur vérifié',
  recipients uuid[] DEFAULT ARRAY['20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002']::uuid[],
  devices integer DEFAULT 0,
  unsubscribed integer DEFAULT 2
) RETURNS jsonb LANGUAGE sql AS $$
SELECT public.creer_notification_message(message_id,saison,title,content,author,author_name,recipients,devices,unsubscribed)
$$;

-- Upgrade a populated original schema, including a recipient already marked read.
SET ROLE service_role;
SELECT pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000009', content=>E'  Message existant\nRépétition 🎶  ');
UPDATE notification_destinataires SET lu_le='2026-11-01 20:15:00+00'
WHERE notification_id='30000000-0000-4000-8000-000000000009'
  AND chanteur_id='20000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000010', content=>repeat('x',501))$q$,'23514');
RESET ROLE;
CREATE TEMP TABLE messages_before_upgrade AS TABLE notification_messages;
CREATE TEMP TABLE recipients_before_upgrade AS TABLE notification_destinataires;
\i /tmp/vde-notification-full-content-migration.sql
\set ON_ERROR_STOP on
SELECT pg_temp.assert(
  NOT EXISTS ((TABLE notification_messages EXCEPT TABLE messages_before_upgrade)
              UNION ALL (TABLE messages_before_upgrade EXCEPT TABLE notification_messages))
  AND NOT EXISTS ((TABLE notification_destinataires EXCEPT TABLE recipients_before_upgrade)
                  UNION ALL (TABLE recipients_before_upgrade EXCEPT TABLE notification_destinataires)),
  'upgrade preserves existing messages and recipients exactly, including read states');
DELETE FROM notification_messages WHERE id='30000000-0000-4000-8000-000000000009';

-- Privileges and RLS are checked independently of application mocks.
SELECT pg_temp.assert(bool_and(relrowsecurity), 'RLS enabled on both tables')
FROM pg_class WHERE oid IN ('public.notification_messages'::regclass,'public.notification_destinataires'::regclass);
SELECT pg_temp.assert(count(*)=0, 'no browser policies') FROM pg_policy
WHERE polrelid IN ('public.notification_messages'::regclass,'public.notification_destinataires'::regclass);
DO $$ DECLARE role_name text; table_name text; privilege_name text; BEGIN
 FOR role_name IN SELECT unnest(ARRAY['anon','authenticated']) LOOP
   FOR table_name IN SELECT unnest(ARRAY['notification_messages','notification_destinataires']) LOOP
     FOR privilege_name IN SELECT unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) LOOP
       PERFORM pg_temp.assert(NOT has_table_privilege(role_name,table_name,privilege_name), role_name || ' cannot ' || privilege_name || ' ' || table_name);
     END LOOP;
   END LOOP;
   PERFORM pg_temp.assert(NOT has_function_privilege(role_name,'public.creer_notification_message(uuid,uuid,text,text,uuid,text,uuid[],integer,integer)','EXECUTE'),role_name || ' cannot invoke RPC');
 END LOOP;
END $$;
SET ROLE anon;
SELECT pg_temp.assert_error('INSERT INTO notification_messages(id) VALUES (gen_random_uuid())','42501');
SELECT pg_temp.assert_error('UPDATE notification_destinataires SET lu_le=now()','42501');
SELECT pg_temp.assert_error('DELETE FROM notification_messages','42501');
SELECT pg_temp.assert_error('SELECT * FROM notification_messages','42501');
SELECT pg_temp.assert_error('SELECT * FROM notification_destinataires','42501');
SELECT pg_temp.assert_error('SELECT pg_temp.publish()','42501');
RESET ROLE;
SET ROLE authenticated;
SELECT pg_temp.assert_error('SELECT * FROM notification_messages','42501');
SELECT pg_temp.assert_error('SELECT * FROM notification_destinataires','42501');
SELECT pg_temp.assert_error('SELECT pg_temp.publish()','42501');
RESET ROLE;

-- Service role can atomically create inbox entries for singers without Push.
SET ROLE service_role;
SELECT pg_temp.assert((pg_temp.publish()->>'created')::boolean, 'first publication created');
SELECT pg_temp.assert((SELECT count(*)=1 FROM notification_messages),'one message');
SELECT pg_temp.assert((SELECT count(*)=2 AND bool_and(lu_le IS NULL) FROM notification_destinataires),'all recipients initially unread');
SELECT pg_temp.assert((SELECT nombre_chanteurs=2 AND nombre_appareils=0 AND nombre_sans_abonnement=2 FROM notification_messages),'zero devices still stores two recipients');
SELECT pg_temp.assert(NOT (pg_temp.publish(recipients=>ARRAY['20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001']::uuid[], author_name=>'Renommé depuis',devices=>1,unsubscribed=>1)->>'created')::boolean,'same selection is idempotent even reordered/deduplicated');
SELECT pg_temp.assert((SELECT count(*)=1 FROM notification_messages) AND (SELECT count(*)=2 FROM notification_destinataires),'replay has no duplicate rows');
SELECT pg_temp.assert((SELECT auteur_nom='Administrateur vérifié' AND nombre_appareils=0 FROM notification_messages),'replay preserves original metadata');
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(title=>'Autre titre')$q$,'P0001','NOTIFICATION_CONFLICT');
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(content=>'Autre contenu')$q$,'P0001','NOTIFICATION_CONFLICT');
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(author=>'00000000-0000-4000-8000-000000000002')$q$,'P0001','NOTIFICATION_CONFLICT');
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(saison=>'10000000-0000-4000-8000-000000000002')$q$,'P0001','NOTIFICATION_CONFLICT');
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(recipients=>ARRAY['20000000-0000-4000-8000-000000000001']::uuid[])$q$,'P0001','NOTIFICATION_CONFLICT');

-- Failed commands must leave neither message nor partial recipient records.
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000002', recipients=>ARRAY['20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003']::uuid[])$q$,'P0001','NOTIFICATION_RECIPIENTS');
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000002', recipients=>ARRAY['20000000-0000-4000-8000-000000000004']::uuid[])$q$,'P0001','NOTIFICATION_RECIPIENTS');
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000002', recipients=>ARRAY['20000000-0000-4000-8000-000000000005']::uuid[])$q$,'P0001','NOTIFICATION_RECIPIENTS');
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000002', recipients=>ARRAY['20000000-0000-4000-8000-000000000001',NULL]::uuid[])$q$,'P0001','NOTIFICATION_RECIPIENTS');
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000002', recipients=>ARRAY[]::uuid[])$q$,'P0001','NOTIFICATION_RECIPIENTS');
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000002', title=>' ')$q$,'23514');
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000002', content=>' ')$q$,'23514');
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000002', content=>repeat('x',1048577))$q$,'23514');
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000002', author=>'00000000-0000-4000-8000-000000000099')$q$,'23503');
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000002', devices=>201)$q$,'23514');
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000002', unsubscribed=>3)$q$,'23514');
SELECT pg_temp.assert((SELECT count(*)=1 FROM notification_messages) AND (SELECT count(*)=2 FROM notification_destinataires),'all failures rolled back both tables');
RESET ROLE;

-- Changing/ambiguous season cannot publish. Exact replay still works later.
UPDATE saisons SET active=false WHERE id='10000000-0000-4000-8000-000000000001';
SET ROLE service_role;
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000002')$q$,'P0001','NOTIFICATION_SEASON');
SELECT pg_temp.assert(NOT (pg_temp.publish()->>'created')::boolean,'replay independent of later season activation');
RESET ROLE;
UPDATE saisons SET active=true;
SET ROLE service_role;
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000002')$q$,'P0001','NOTIFICATION_SEASON');
RESET ROLE;
UPDATE saisons SET active=false WHERE id='10000000-0000-4000-8000-000000000002';

-- Even an accidental future table GRANT is blocked by RLS.
GRANT SELECT ON notification_messages,notification_destinataires TO anon,authenticated;
SET ROLE anon;
SELECT pg_temp.assert((SELECT count(*)=0 FROM notification_messages) AND (SELECT count(*)=0 FROM notification_destinataires),'anon sees zero rows under RLS');
RESET ROLE;
SET ROLE authenticated;
SELECT pg_temp.assert((SELECT count(*)=0 FROM notification_messages) AND (SELECT count(*)=0 FROM notification_destinataires),'authenticated sees zero rows under RLS');
RESET ROLE;
REVOKE SELECT ON notification_messages,notification_destinataires FROM anon,authenticated;

-- Snapshot survives deleting the Auth account; deleting message cascades inbox.
SET ROLE service_role;
SELECT pg_temp.assert((pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000003',author=>'00000000-0000-4000-8000-000000000002')->>'created')::boolean,'second author publication');
RESET ROLE;
DELETE FROM auth.users WHERE id='00000000-0000-4000-8000-000000000002';
SELECT pg_temp.assert((SELECT auteur_id IS NULL AND auteur_nom='Administrateur vérifié' FROM notification_messages WHERE id='30000000-0000-4000-8000-000000000003'),'author snapshot survives Auth deletion');
DELETE FROM notification_messages WHERE id='30000000-0000-4000-8000-000000000003';
SELECT pg_temp.assert((SELECT count(*)=2 FROM notification_destinataires),'deleting message cascades only its recipients');

-- Full messages retain Unicode, line breaks and their exact content beyond 500 chars.
SET ROLE service_role;
DO $$ DECLARE full_content text := E'  Début\n' || repeat(E'🎶 Répétition : voix, cœur, café.\n',30) || E'Fin 👨‍👩‍👧‍👦  '; result jsonb; BEGIN
  PERFORM pg_temp.assert(char_length(full_content)>500,'long-content fixture exceeds the former character limit');
  result := pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000011',content=>full_content);
  PERFORM pg_temp.assert((result->>'created')::boolean AND result->'message'->>'contenu'=full_content,'RPC returns exact full Unicode message');
  PERFORM pg_temp.assert((SELECT contenu=full_content FROM notification_messages WHERE id='30000000-0000-4000-8000-000000000011'),'database stores full message without truncating or normalizing');
  PERFORM pg_temp.assert((SELECT count(*)=2 FROM notification_destinataires WHERE notification_id='30000000-0000-4000-8000-000000000011'),'long message creates all recipient entries');
  PERFORM pg_temp.assert(NOT (pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000011',content=>full_content)->>'created')::boolean,'full-content retry remains idempotent');
  PERFORM pg_temp.assert_error(format('SELECT pg_temp.publish(message_id=>%L,content=>%L)', '30000000-0000-4000-8000-000000000011',full_content || ' modifié'),'P0001','NOTIFICATION_CONFLICT');
END $$;

-- The bound is UTF-8 bytes: one-byte and four-byte code points fit exactly at 1 Mio.
SELECT pg_temp.assert((pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000012', content=>repeat('x',1048576))->>'created')::boolean,'exact 1 Mio ASCII message accepted');
SELECT pg_temp.assert((pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000013', content=>repeat('🎶',262144))->>'created')::boolean,'exact 1 Mio multibyte message accepted');
SELECT pg_temp.assert((SELECT bool_and(octet_length(contenu)=1048576) FROM notification_messages WHERE id IN ('30000000-0000-4000-8000-000000000012','30000000-0000-4000-8000-000000000013')),'boundary messages retain every byte');
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000014', content=>repeat('🎶',262144) || 'x')$q$,'23514','notification_messages_contenu_check');
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000014', content=>repeat('🎶',262145))$q$,'23514','notification_messages_contenu_check');
SELECT pg_temp.assert((SELECT count(*)=0 FROM notification_messages WHERE id='30000000-0000-4000-8000-000000000014')
  AND (SELECT count(*)=0 FROM notification_destinataires WHERE notification_id='30000000-0000-4000-8000-000000000014'),'oversized UTF-8 attempts leave neither a message nor recipients');
SELECT pg_temp.assert_error($q$SELECT pg_temp.publish(message_id=>'30000000-0000-4000-8000-000000000014', title=>repeat('x',81))$q$,'23514','notification_messages_titre_check');
RESET ROLE;
\o
SELECT 'PASS: upgrade preserves history, full Unicode content and 1 Mio byte boundary, PostgreSQL permissions, RLS, zero-device inbox, idempotency, conflicts, rollback and foreign keys' AS result;
