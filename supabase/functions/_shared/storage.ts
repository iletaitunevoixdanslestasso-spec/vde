export async function createSignedDownloadUrl(
    supabaseAdmin,
    bucket: string,
    path: string,
    expiresIn = 3600,
    download = false
) {

    if (!path) {
        return {
            url: null,
            error: null
        };
    }

    const {
        data,
        error
    } = await supabaseAdmin
        .storage
        .from(bucket)
        .createSignedUrl(
            path,
            expiresIn,
            download
                ? {
                    download: true
                }
                : undefined
        );

    if (error) {

        console.error(
            "createSignedUrl error",
            {
                bucket,
                path,
                error
            }
        );

        return {
            url: null,
            error
        };
    }

    return {
        url: data.signedUrl,
        error: null
    };
}