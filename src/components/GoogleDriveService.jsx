
const API = "https://www.googleapis.com/drive/v3";

export class GoogleDriveService {

    constructor(accessToken) {
        this.accessToken = accessToken;
    }

    async listerImages(folderId = "12IJ0rBNdGRFP4rp4fRL6Eq4xoQk5RqMt" ) {

        const groupe1FolderId = "1J6Jd9Ks4jUUN6G5A37Is7TsfaDtge-y7";
        const groupe2FolderId = "1dcVfz0BttUWAZ59ndcMD5xMFHycZBG0J";
        const images = [];
        let pageToken = null;

        do {
            const params = new URLSearchParams({
                q: `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`,
                fields: "nextPageToken,files(id,name,mimeType,size)",
                pageSize: "1000"
            });

            if (pageToken) {
                params.set("pageToken", pageToken);
            }

            const response = await fetch(
                `${API}/files?${params}`,
                {
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(await response.text());
            }

            const data = await response.json();

            images.push(...(data.files || []));
            pageToken = data.nextPageToken;

        } while (pageToken);

        return images;
    }

    async recupererImage(fileId) {

        const response = await fetch(
            `${API}/files/${encodeURIComponent(fileId)}?alt=media`,
            {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(await response.text());
        }

        return await response.blob();
    }

    async telechargerImage(file) {

        const blob = await this.recupererImage(file.id);

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
}
