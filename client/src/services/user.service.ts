import { ApiRoute } from "@/types";
import { apiConfig } from "@/types/pagesConfig";

const mediaCache = new Map<string, string>();

export class userService implements ApiRoute {
    instance;
    baseUrl;

    constructor() {
        this.instance = apiConfig.users.baseInstance;
        this.baseUrl = apiConfig.users;
    }

    async updateUserData(userConfig: any) {
        const { data } = await this.instance.patch('', userConfig)
        return data
    }

    async getUserDeals() {
        const { data } = await this.instance.get(this.baseUrl.deals)
        return data
    }

    async getMediaData(fileId: string) {
        if (mediaCache.has(fileId)) {
            const cachedBlob = mediaCache.get(fileId);
            if (cachedBlob) {
                return cachedBlob;
            }
        }

        const { data } = await apiConfig.scamform.baseInstance.get(`file/${fileId}`, {
            responseType: 'blob'
        })

        mediaCache.set(fileId, data);

        return data
    }

  
    clearMediaCache() {
        mediaCache.clear();
    }

    removeFromCache(fileId: string) {
        mediaCache.delete(fileId);
    }
}


export const UserService = new userService()