import { ITelegramAuth, ITelegramUser, IUser } from "@/types/auth";
import { apiConfig } from "@/types/pagesConfig";

class authService {
    instance
    baseUrl

    constructor() {
        this.instance = apiConfig.auth.baseInstance;
        this.baseUrl = apiConfig.auth;
    }

    async login(telegramData: ITelegramUser) {
        const { data } = await this.instance.post(this.baseUrl.login, telegramData)
        return data
    }
    
    async getProfile(): Promise<IUser | null> {
        try {
            const { data } = await this.instance.get(this.baseUrl.profile)
            return data;
        } catch (error) {
            return null;
        }
    }
}


export const AuthService = new authService()