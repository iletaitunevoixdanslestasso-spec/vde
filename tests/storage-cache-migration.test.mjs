import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { applyMigration, createObjectInfoReader, inventory } from '../scripts/storage-cache-migration.mjs';

const bytes = new TextEncoder().encode('content');
const customMetadata = { custom_key: 'original', customKey: 'distinct', nested_value: { another_key: 42 } };
const rawInfo = (id, contentType) => ({ id, version: 'v1', size: bytes.length,
  content_type: contentType, cache_control: 'max-age=3600', metadata: structuredClone(customMetadata) });

function fixture() {
  let writes = 0;
  const objects = new Map([
    ['photos-chanteurs/chanteurs/1/photo.png', rawInfo('1', 'image/png')],
    ['chanteur-documents/1/droit_image.pdf', rawInfo('2', 'application/pdf')],
    ['referentiel-documents/dai.pdf', { ...rawInfo('3', 'application/pdf'), cache_control: 'max-age=12960000' }],
  ]);
  const lists = {
    'photos-chanteurs/': [{ name: 'chanteurs', id: null }],
    'photos-chanteurs/chanteurs': [{ name: '1', id: null }],
    'photos-chanteurs/chanteurs/1': [{ name: 'photo.png', id: '1' }],
    'chanteur-documents/': [{ name: '1', id: null }, { name: 'unrelated.pdf', id: 'not-dai' }],
    'chanteur-documents/1': [{ name: 'droit_image.pdf', id: '2' }, { name: 'other.pdf', id: 'not-dai' }],
  };
  const fetchInfo = async url => {
    const path = decodeURIComponent(new URL(url).pathname.replace('/storage/v1/object/info/', ''));
    return Response.json(objects.get(path));
  };
  const readInfo = createObjectInfoReader('https://cache.example', 'test-service-key', fetchInfo);
  const client = { storage: { from: bucket => ({
    list: async prefix => ({ data: lists[`${bucket}/${prefix}`] || [], error: null }),
    // This SDK path must NEVER be used: it loses custom key spelling.
    info: async () => { throw new Error('SDK .info() recursively transforms custom metadata'); },
    download: async () => ({ data: new Blob([bytes]), error: null }),
    update: async (path, body, options) => {
      writes++;
      const object = objects.get(`${bucket}/${path}`);
      assert.deepEqual(new Uint8Array(body), bytes);
      assert.equal(options.contentType, object.content_type);
      assert.deepEqual(options.metadata, customMetadata);
      object.version = 'v2';
      object.cache_control = `max-age=${options.cacheControl}`;
      object.metadata = structuredClone(options.metadata);
      return { data: { path }, error: null };
    },
  }) }, from: () => {
    const query = { select: () => query, eq: () => query, is: () => query, order: () => query,
      range: async () => ({ data: [{ id: '3', path: 'dai.pdf' }], error: null }) };
    return query;
  } };
  return { client, readInfo, writes: () => writes };
}

test('raw object-info retains custom key spelling despite storage-js recursive camel conversion', async () => {
  const raw = rawInfo('1', 'image/png');
  const fetcher = async () => Response.json(raw);
  const sdk = createClient('https://cache.example', 'test-key', { global: { fetch: fetcher },
    auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sdk.storage.from('photos-chanteurs').info('photo.png');
  assert.equal(error, null);
  assert.notDeepEqual(data.metadata, raw.metadata); // Reproduces the installed SDK bug.
  assert.equal(data.metadata.custom_key, undefined);
  const reader = createObjectInfoReader('https://cache.example', 'test-key', fetcher);
  const info = await reader('photos-chanteurs', 'photo.png');
  assert.deepEqual(info.metadata, customMetadata);
  assert.equal(info.contentType, 'image/png');
});

test('inventory is read-only; migration backs up raw metadata and preserves original keys and bytes', async () => {
  const f = fixture();
  const root = await mkdtemp(join(tmpdir(), 'vde-storage-migration-'));
  try {
    const files = await inventory(f.client, f.readInfo);
    assert.equal(files.length, 3);
    assert.equal(files.filter(file => file.needsUpdate).length, 2);
    assert.equal(f.writes(), 0);
    const result = await applyMigration(f.client, files, join(root, 'backup'), f.readInfo);
    assert.equal(result.status, 'verified');
    assert.equal(f.writes(), 2);
    const saved = JSON.parse(await readFile(join(root, 'backup', 'manifest.json'), 'utf8'));
    assert(saved.files.every(file => file.verified));
    for (const file of saved.files) assert.deepEqual(file.info.metadata, customMetadata);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('missing raw metadata reader and incomplete backups fail before any Storage update', async () => {
  const f = fixture();
  await assert.rejects(inventory(f.client), /raw object-info reader/);
  const root = await mkdtemp(join(tmpdir(), 'vde-storage-migration-'));
  try {
    const files = await inventory(f.client, f.readInfo);
    await assert.rejects(applyMigration(f.client, files, join(root, 'not-created')), /raw object-info reader/);
    let downloads = 0;
    const broken = { storage: { from: bucket => {
      const api = f.client.storage.from(bucket);
      return { ...api, download: async () => ++downloads === 2 ?
        { data: new Blob(['bad']), error: null } : api.download() };
    } } };
    await assert.rejects(applyMigration(broken, files, join(root, 'failed-backup'), f.readInfo), /size mismatch/);
    assert.equal(f.writes(), 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});
