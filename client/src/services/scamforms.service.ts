import { ApiRoute, ScammerStatus, voteType } from "@/types";
import { apiConfig } from "@/types/pagesConfig";

export class scamformsService implements ApiRoute {
    instance;
    baseUrl;

    constructor() {
        this.instance = apiConfig.scamform.baseInstance;
        this.baseUrl = apiConfig.scamform;
    }

    getAllScamForms = async (params: any) => {
        const { page = 1, limit = 10, search = '', showMarked = false } = params;
        const query = `page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}&showMarked=${showMarked}`;
        const { data } = await this.instance.get(`?${query}`)
        return data
    }

    userVote = async (formId: string, voteType: voteType) => {
        const { data } = await this.instance.patch(`${this.baseUrl.vote}/${voteType}/${formId}`)
        return data
    }

    getScammers = async (params: any) => {
        const { page = 1, limit = 10, search = '', showMarked = false } = params;
        console.log(showMarked)
        const query = `page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}&showMarked=${showMarked}`;

        const { data } = await this.instance.get(`${this.baseUrl.scammers}?${query}`)
        return data
    }

    confirmScammerStatus = async (scammerId: string, status: ScammerStatus, formId: string | undefined) => {
        const { data } = await this.instance.patch(`${this.baseUrl.confirm}`, {
            scammerId,
            status,
            formId
        })
        return data
    }
}

export const ScamformsService = new scamformsService()