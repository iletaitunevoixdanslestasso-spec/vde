#!/usr/bin/env node
/** Opt-in Storage migration. Never writes storage.objects or changes bucket visibility. */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { createClient } from '@supabase/supabase-js';

export const CACHE_SECONDS = 12960000;
const PAGE_SIZE = 100;
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function unwrap(result, operation) {
  if (result.error) throw new Error(`${operation} failed. Check Storage/API permissions; no credentials are logged.`);
  return result.data;
}

function ttl(value) {
  const match = String(value ?? '').match(/(?:max-age=)?(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function safePath(path) {
  return typeof path === 'string' && path.length > 0 && !path.startsWith('/') &&
    !path.split('/').some(part => !part || part === '.' || part === '..');
}

// storage-js .info() recursively camel-cases *custom* metadata keys. Read the
// documented REST endpoint directly and normalize only its known top-level keys.
// All credentials follow the same inherited HTTPS proxy/CA route as the SDK.
export function createObjectInfoReader(supabaseUrl, serviceRoleKey, fetcher = fetch) {
  const base = new URL(supabaseUrl);
  if (base.protocol !== 'https:' || base.username || base.password) {
    throw new Error('Object info requires a credential-free HTTPS Supabase URL.');
  }
  return async (bucket, path) => {
    if (!safePath(bucket) || bucket.includes('/') || !safePath(path)) {
      throw new Error('Invalid Storage object path.');
    }
    const encodedPath = [bucket, ...path.split('/')].map(encodeURIComponent).join('/');
    const url = new URL(`/storage/v1/object/info/${encodedPath}`, base);
    const response = await fetcher(url, {
      method: 'GET', cache: 'no-store', credentials: 'omit',
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });
    if (!response.ok) throw new Error('Object info failed; check Storage/API permissions.');
    const raw = await response.json();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('Object info returned an invalid response.');
    }
    return {
      ...raw,
      cacheControl: raw.cache_control ?? raw.cacheControl,
      contentType: raw.content_type ?? raw.contentType,
      // Deliberately NO recursive conversion: original nested metadata keys matter.
      metadata: raw.metadata,
    };
  };
}

function requireInfoReader(readInfo) {
  if (typeof readInfo !== 'function') {
    throw new Error('A raw object-info reader is required to preserve custom metadata.');
  }
}

export async function inventory(client, readInfo) {
  requireInfoReader(readInfo);
  const files = [];
  async function walk(bucket, prefix = '') {
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const page = unwrap(await client.storage.from(bucket).list(prefix, {
        limit: PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' },
      }), 'List');
      for (const item of page) {
        const path = prefix ? `${prefix}/${item.name}` : item.name;
        if (!safePath(path)) throw new Error('Unexpected Storage path; inventory aborted.');
        if (!item.id) await walk(bucket, path);
        else if (bucket === 'photos-chanteurs' || /^[^/]+\/droit_image\.pdf$/i.test(path)) {
          files.push({ bucket, path, listedId: item.id, listedUpdatedAt: item.updated_at });
        }
      }
      if (page.length < PAGE_SIZE) break;
    }
  }
  await walk('photos-chanteurs');
  await walk('chanteur-documents');
  // Only DAI templates, never the unrelated reference documents in this bucket.
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = unwrap(await client.from('referentiel_documents')
      .select('id,path,document_types!inner(code)')
      .eq('document_types.code', 'droit_image').is('deleted_at', null)
      .order('id', { ascending: true }).range(offset, offset + PAGE_SIZE - 1), 'DAI template query');
    for (const item of page) {
      if (!safePath(item.path)) throw new Error('Invalid DAI template path; inventory aborted.');
      files.push({ bucket: 'referentiel-documents', path: item.path });
    }
    if (page.length < PAGE_SIZE) break;
  }
  const unique = [...new Map(files.map(file => [file.bucket + '/' + file.path, file])).values()];
  for (const file of unique) {
    const info = await readInfo(file.bucket, file.path);
    file.info = info;
    file.needsUpdate = ttl(info.cacheControl) < CACHE_SECONDS;
    if (!info.id || !info.version || !Number.isFinite(info.size) || !info.contentType) {
      throw new Error('Incomplete object metadata; refusing a migration that cannot preserve and verify files.');
    }
    if (file.listedId && file.listedId !== info.id) throw new Error('Object changed during inventory; retry after pausing uploads.');
    if (file.bucket !== 'photos-chanteurs' && !/application\/pdf/i.test(info.contentType)) {
      throw new Error('A DAI target is not a PDF; review the inventory before continuing.');
    }
  }
  return unique;
}

function unchanged(before, after) {
  return before.id === after.id && before.version === after.version && before.size === after.size;
}

export async function applyMigration(client, files, backupDir, readInfo) {
  requireInfoReader(readInfo);
  // A brand-new directory prevents accidental overwrite of an earlier backup.
  await mkdir(backupDir, { mode: 0o700 });
  const manifestPath = resolve(backupDir, 'manifest.json');
  const manifest = { createdAt: new Date().toISOString(), cacheSeconds: CACHE_SECONDS, status: 'backing-up', files: [] };
  const save = () => writeFile(manifestPath, JSON.stringify(manifest, null, 2), { mode: 0o600 });
  await save();
  // Complete and verify ALL backups before changing the first remote object.
  for (const file of files.filter(file => file.needsUpdate)) {
    const api = client.storage.from(file.bucket);
    const current = await readInfo(file.bucket, file.path);
    if (!unchanged(file.info, current)) throw new Error('Object changed since inventory; migration aborted before writes.');
    const blob = unwrap(await api.download(file.path), 'Backup download');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes.length !== file.info.size) throw new Error('Backup size mismatch; migration aborted before writes.');
    const backupFile = sha256(file.bucket + '/' + file.path) + '.bin';
    const checksum = sha256(bytes);
    await writeFile(resolve(backupDir, backupFile), bytes, { flag: 'wx', mode: 0o600 });
    if (sha256(await readFile(resolve(backupDir, backupFile))) !== checksum) throw new Error('Backup checksum mismatch.');
    const after = await readInfo(file.bucket, file.path);
    if (!unchanged(file.info, after)) throw new Error('Object changed during backup; migration aborted before writes.');
    manifest.files.push({ ...file, backupFile, sha256: checksum, migrated: false });
    await save();
  }
  manifest.status = 'backed-up';
  await save();
  for (const file of manifest.files) {
    const api = client.storage.from(file.bucket);
    const current = await readInfo(file.bucket, file.path);
    if (!unchanged(file.info, current)) throw new Error('Object changed after backup; stop and review the manifest.');
    const bytes = await readFile(resolve(backupDir, file.backupFile));
    if (sha256(bytes) !== file.sha256) throw new Error('Backup checksum changed; refusing update.');
    unwrap(await api.update(file.path, bytes, {
      cacheControl: String(CACHE_SECONDS), contentType: file.info.contentType,
      ...(file.info.metadata ? { metadata: file.info.metadata } : {}),
    }), 'Storage update');
    file.migrated = true;
    await save();
    const verified = await readInfo(file.bucket, file.path);
    if (verified.id !== file.info.id || verified.size !== file.info.size ||
        verified.contentType !== file.info.contentType || ttl(verified.cacheControl) < CACHE_SECONDS ||
        !isDeepStrictEqual(verified.metadata ?? {}, file.info.metadata ?? {})) {
      throw new Error('Post-update metadata verification failed; stop and review the backup manifest.');
    }
    // Re-read bytes as well: the extra egress is intentional for this one-time integrity check.
    const downloaded = unwrap(await api.download(file.path), 'Verification download');
    if (sha256(new Uint8Array(await downloaded.arrayBuffer())) !== file.sha256) {
      throw new Error('Post-update content checksum mismatch; stop and review the backup.');
    }
    file.verified = true;
    await save();
  }
  manifest.status = 'verified';
  await save();
  return manifest;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Dry run: NODE_USE_ENV_PROXY=1 node scripts/storage-cache-migration.mjs [--output inventory.json]\nApply: add --apply --confirm-paused-writes --backup-dir /secure/new-directory\nRequires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Never pass keys on the command line.');
    return;
  }
  const allowed = new Set(['--apply', '--confirm-paused-writes', '--backup-dir', '--output']);
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!allowed.has(arg)) throw new Error('Unknown argument. Use --help.');
    if (arg === '--backup-dir' || arg === '--output') {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error('Missing path argument.');
      options[arg] = value;
    } else options[arg] = true;
  }
  if (options['--apply'] && (!options['--confirm-paused-writes'] || !options['--backup-dir'])) {
    throw new Error('Apply requires paused uploads/synchronisation and --confirm-paused-writes --backup-dir.');
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY securely; do not paste keys into chat or command arguments.');
  }
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const readInfo = createObjectInfoReader(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const files = await inventory(client, readInfo);
  console.log(JSON.stringify({ mode: options['--apply'] ? 'apply' : 'dry-run', total: files.length,
    needsUpdate: files.filter(file => file.needsUpdate).length,
    backupBytes: files.filter(file => file.needsUpdate).reduce((sum, file) => sum + file.info.size, 0) }));
  if (options['--output']) await writeFile(resolve(options['--output']), JSON.stringify(files, null, 2), { flag: 'wx', mode: 0o600 });
  if (options['--apply']) {
    const result = await applyMigration(client, files, resolve(options['--backup-dir']), readInfo);
    console.log(JSON.stringify({ status: result.status, migrated: result.files.length }));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => { console.error('Migration stopped. No automatic retry or rollback. Review local inventory/backup manifest and the last operation; credentials are never logged.'); process.exitCode = 1; });
}
