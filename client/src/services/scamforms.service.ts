import { ApiRoute } from "@/types";
import { apiConfig } from "@/types/pagesConfig";

export class scamformsService implements ApiRoute {
    instance;
    baseUrl;

    constructor() {
        this.instance = apiConfig.scamform.baseInstance;
        this.baseUrl = apiConfig.scamform;
    }

    getAllScamForms = async (params: any) => {
        const { page = 1, limit = 10, search = '' } = params;
        const query = `page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
        const { data } = await this.instance.get(`?${query}`)
        return data
    }

    getAllUserScamForms = async (params: any, userData: string) => {
        const { page = 1, limit = 10 } = params;
        const query = `page=${page}&limit=${limit}`;
        const { data } = await this.instance.get(`${this.baseUrl.users}/${userData}?${query}`)
        return data
    }







}


export const ScamformsService = new scamformsService()