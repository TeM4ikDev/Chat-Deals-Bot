import { ApiRoute } from "@/types";
import { apiConfig } from "@/types/pagesConfig";

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


    async getMediaData(fileId: string){
        return this.instance.get(`scamform/file/${fileId}`)
    }







}


export const UserService = new userService()