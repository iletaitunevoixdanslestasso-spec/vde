#!/usr/bin/env bash
# Isolated SQL validation only: no network, no Supabase credentials or existing DB.
set -euo pipefail
repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
image='postgres:17-alpine'
container_id=''
output_dir="$(mktemp -d)"
docker_local() {
    env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
        docker --host=unix:///var/run/docker.sock "$@"
}
cleanup() {
    if [[ -n "$container_id" ]]; then docker_local rm -f "$container_id" >/dev/null 2>&1 || true; fi
    rm -rf -- "$output_dir"
}
trap cleanup EXIT
if ! docker_local image inspect "$image" >/dev/null 2>&1; then
    echo "Local image $image required. Pull the official image before running this test." >&2
    exit 1
fi
container_id="$(docker_local run --pull never --rm -d --network none \
    --tmpfs /var/lib/postgresql/data:rw \
    --mount "type=bind,src=$repo_dir/supabase/migrations/20261105140000_notification_messages.sql,dst=/tmp/vde-notification-migration.sql,readonly" \
    --mount "type=bind,src=$repo_dir/tests/notification-history-sql.sql,dst=/tmp/vde-notification-tests.sql,readonly" \
    -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=vde_notification_history_sql_test "$image")"
psql_local() {
    docker_local exec -i -e 'PGOPTIONS=-c vde.notification_test=disposable' "$container_id" \
        psql -X -qAt -U postgres -d vde_notification_history_sql_test -v ON_ERROR_STOP=1 "$@"
}
ready=false
for ((attempt=0; attempt<60; attempt++)); do
    if psql_local -c 'SELECT 1' >/dev/null 2>&1; then ready=true; break; fi
    sleep 0.2
done
if [[ "$ready" != true ]]; then
    docker_local logs "$container_id" >&2
    exit 1
fi
psql_local -f /tmp/vde-notification-tests.sql

# Two independent transactions using the same ID must serialize and deduplicate.
message_id='30000000-0000-4000-8000-000000000004'
rpc="SELECT public.creer_notification_message('$message_id','10000000-0000-4000-8000-000000000001','Concurrent','Message concurrent','00000000-0000-4000-8000-000000000001','Admin',ARRAY['20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002']::uuid[],0,2)->>'created';"
psql_local -c "BEGIN; SET application_name='vde_notification_sql_first'; SET ROLE service_role; SELECT pg_advisory_xact_lock(hashtextextended('$message_id',0)); SELECT pg_sleep(2); $rpc COMMIT;" >"$output_dir/first" &
first_pid=$!
lock_ready=false
for ((attempt=0; attempt<30; attempt++)); do
    if [[ "$(psql_local -c "SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE application_name='vde_notification_sql_first' AND wait_event='PgSleep');")" == t ]]; then
        lock_ready=true; break
    fi
    sleep 0.05
done
if [[ "$lock_ready" != true ]]; then wait "$first_pid"; echo 'Concurrent test could not synchronize.' >&2; exit 1; fi
psql_local -c "SET ROLE service_role; $rpc" >"$output_dir/second"
wait "$first_pid"
[[ "$(tail -n 1 "$output_dir/first")" == true ]]
[[ "$(tail -n 1 "$output_dir/second")" == false ]]
[[ "$(psql_local -c "SELECT (SELECT count(*) FROM notification_messages WHERE id='$message_id')::text || ',' || (SELECT count(*) FROM notification_destinataires WHERE notification_id='$message_id')::text;")" == '1,2' ]]
echo 'PASS: concurrent same-ID publication creates one message and exactly two recipients'
