import { supabase } from "../core/supabase/client";


const sanitizeFileName = (fileName) => {
    return fileName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
};

class StorageService {

    async upload(bucket, path, file) {

        const parts = path.split("/");
        const fileName = parts.pop();

        const safeFileName = sanitizeFileName(fileName);

        const safePath = [
            ...parts,
            safeFileName
        ].join("/");

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(safePath, file, {
                upsert: true,
            });

        if (error) {
            throw error;
        }

        return data;
    }

    async remove(bucket, path) {
        const { data, error } = await supabase.storage
            .from(bucket)
            .remove([path]);

        if (error) {
            throw error;
        }

        return data;
    }

    async createSignedUrl(bucket, path, expiresIn = 3600) {
        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, expiresIn);

        if (error) {
            throw error;
        }

        return data.signedUrl;
    }

    async createSignedUploadUrl(bucket, path) {
        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUploadUrl(path, {
                upsert: true
            });

        if (error) {
            throw error;
        }

        return data;
    }

    async uploadToSignedUrl(bucket, path, token, file) {
        const { data, error } = await supabase.storage
            .from(bucket)
            .uploadToSignedUrl(
                path,
                token,
                file,
                {
                    contentType: file.type
                }
            );

        if (error) {
            throw error;
        }

        return data;
    }

    async createChanteurDroitImageUpload(token) {
        const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-chanteur-droit-image-upload`,
            {
                method: "POST",
                headers: {
                    "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                "Impossible d'obtenir l'autorisation d'upload."
            );
        }

        return result;
    }
}

export default new StorageService();