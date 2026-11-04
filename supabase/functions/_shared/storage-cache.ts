import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export const STORAGE_CACHE_SECONDS = 12960000;
export type StorageCacheCode = "photos_choristes" | "pdf_dai";
export interface StorageCacheConfig {
    code: StorageCacheCode;
    cache_version: number;
    cache_seconds: number;
    updated_at: string;
}

// Read after the caller has authenticated/validated the chanteur token. There
// is no cross-user or persistent cache of signed private URLs on the server.
export async function readStorageCacheConfig(db: SupabaseClient): Promise<StorageCacheConfig[]> {
    const { data, error } = await db.from("storage_cache_config")
        .select("code, cache_version, cache_seconds, updated_at")
        .in("code", ["photos_choristes", "pdf_dai"]);
    if (error) throw error;
    if (data?.length !== 2 || data.some(row =>
        !Number.isSafeInteger(row.cache_version) || row.cache_version < 1 ||
        !Number.isSafeInteger(row.cache_seconds) || row.cache_seconds < 1
    )) throw new Error("Configuration du cache Storage absente ou invalide.");
    return data as StorageCacheConfig[];
}

export function versionStorageUrl(url: string | null, config: StorageCacheConfig[], code: StorageCacheCode) {
    if (!url) return null;
    const version = config.find(row => row.code === code)?.cache_version;
    if (!version) throw new Error("Version du cache Storage absente.");
    const parsed = new URL(url);
    parsed.searchParams.set("v", String(version));
    return parsed.href;
}
