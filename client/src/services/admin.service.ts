import { ApiRoute } from "@/types";
import { UserRoles } from "@/types/auth";
import { apiConfig } from "@/types/pagesConfig";

export class adminService implements ApiRoute {
    instance
    baseUrl

    constructor() {
        this.instance = apiConfig.admin.baseInstance;
        this.baseUrl = apiConfig.admin;
    }


    getUsers = async (params: any) => {
        const { page = 1, limit = 10, search = '' } = params;
        const query = `page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
        const { data } = await this.instance.get(`${this.baseUrl.users.main}?${query}`)
        return data
    }


    updateUserRole = async (userId: string, role: UserRoles) => {
        const { data } = await this.instance.patch(`${this.baseUrl.users.updateRole}`, { userId, role })
        return data
    }

    async getUserDetails(userId: string) {
        const { data } = await this.instance.get(`${this.baseUrl.users.main}/${userId}`)
        return data
    }

    updateUserBanned = async (userId: string, banned: boolean) => {
        const { data } = await this.instance.patch(`${this.baseUrl.users.updateBanned}`, { userId, banned })
        return data
    }


    deleteScamForm = async (formId: string) => {
        const { data } = await this.instance.delete(`${this.baseUrl.scamforms.main}/${formId}`)
        return data
    }




    getAllGarants = async () => {
        const { data } = await this.instance.get(`${this.baseUrl.garants.main}`)
        return data
    }

    addGarant = async (username: string, description: string) => {
        const { data } = await this.instance.post(`${this.baseUrl.garants.main}`, { username, description })
        return data
    }

    removeGarant = async (username: string) => {
        const { data } = await this.instance.delete(`${this.baseUrl.garants.main}/${username}`)
        return data
    }

    updateGarant = async (username: string, description: string) => {
        const { data } = await this.instance.patch(`${this.baseUrl.garants.main}`, { username, description })
        return data
    }














}


export const AdminService = new adminService()