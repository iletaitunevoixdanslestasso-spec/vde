-- No Storage bucket policy or public/private flag is changed by this migration.
create table if not exists public.storage_cache_config (
    code text primary key,
    cache_version bigint not null default 1 check (cache_version > 0),
    cache_seconds integer not null default 12960000 check (cache_seconds > 0),
    updated_at timestamptz not null default now()
);

insert into public.storage_cache_config (code, cache_seconds)
values ('photos_choristes', 12960000), ('pdf_dai', 12960000)
on conflict (code) do update set cache_seconds = excluded.cache_seconds;

alter table public.storage_cache_config enable row level security;
-- Only metadata may be read by authenticated users. Choristers without Auth
-- sessions read it through their existing token validation in the Edge Function.
revoke all on public.storage_cache_config from anon, authenticated;
grant select on public.storage_cache_config to authenticated;
grant select, update on public.storage_cache_config to service_role;
drop policy if exists storage_cache_config_authenticated_read on public.storage_cache_config;
create policy storage_cache_config_authenticated_read
    on public.storage_cache_config for select to authenticated using (true);

-- Only the service role may increment versions, after the Edge Function has
-- checked the real Auth UID against the existing administrator allowlist.
create or replace function public.increment_storage_cache_version(p_code text)
returns setof public.storage_cache_config
language plpgsql security invoker set search_path = '' as $$
begin
    if p_code not in ('photos_choristes', 'pdf_dai') or p_code is null then
        raise exception 'Unknown storage cache category';
    end if;
    return query update public.storage_cache_config
        set cache_version = cache_version + 1, updated_at = now()
        where code = p_code returning *;
    if not found then
        raise exception 'Storage cache category not configured';
    end if;
end;
$$;
revoke all on function public.increment_storage_cache_version(text) from public, anon, authenticated;
grant execute on function public.increment_storage_cache_version(text) to service_role;
