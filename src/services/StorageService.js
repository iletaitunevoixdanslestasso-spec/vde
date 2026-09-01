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

    async createSignedUrl_old(bucket, path, expiresIn = 3600) {
        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, expiresIn);

        if (error) {
            throw error;
        }

        return data.signedUrl;
    }
    async createSignedUrl(bucket, path, expiresIn = 3600) {
        try {
            const cleanPath =
                typeof path === "string"
                    ? path
                    : path?.path;

            if (!cleanPath) {
                console.error("StorageService.createSignedUrl : path invalide", path);
                return null;
            }

            const { data, error } = await supabase.storage
                .from(bucket)
                .createSignedUrl(cleanPath, expiresIn);

            if (error) {
                console.error(
                    "Erreur création URL signée :",
                    cleanPath,
                    error
                );
                return null;
            }

            return data?.signedUrl ?? null;

        } catch (error) {
            console.error(
                "Erreur inattendue createSignedUrl :",
                error
            );

            return null;
        }
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

    async uploadToSignedUrl_old(bucket, path, token, file) {
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

    async uploadToSignedUrl(bucket, path, token, file) {
        console.log(bucket)
        console.log( path)
        console.log( token)
        console.log( file)
        const cleanPath =
            typeof path === "string"
                ? path
                : path?.path;

        if (!cleanPath) {
            throw new Error(
                `uploadToSignedUrl : path invalide : ${JSON.stringify(path)}`
            );
        }

        if (!token) {
            throw new Error("uploadToSignedUrl : token manquant");
        }

        if (!file) {
            throw new Error("uploadToSignedUrl : fichier manquant");
        }

        const { data, error } = await supabase.storage
            .from(bucket)
            .uploadToSignedUrl(
                cleanPath,
                token,
                file
            );

        if (error) {
            throw error;
        }

        return data;
    }

    async createChanteurDroitImageUpload_old(token) {
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
    async createChanteurDroitImageUpload(token) {

        return await this.callChanteurFunction(
            "create-chanteur-droit-image-upload",
            token
        );
    }

    async getChanteurDocuments(token) {

        return await this.callChanteurFunction(
            "get-chanteur-documents",
            token
        );
    }

    async callChanteurFunction(functionName, token, body = {}) {

        const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
            {
                method: "POST",
                headers: {
                    "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token,
                    ...body
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                `Erreur lors de l'appel à ${functionName}.`
            );
        }

        return result;
    }

    async getChansonParoles(token, chansonId) {

        const result = await this.callChanteurFunction(
            "get-chanteur-chanson-paroles",
            token,
            {
                chansonId
            }
        );

        return result?.data || null;
    }
}

export default new StorageService();