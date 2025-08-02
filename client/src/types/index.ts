import { AxiosInstance } from "axios";
import { ITelegramUser } from "./auth";

declare global {
    interface Window {
        Telegram: {
            WebApp: {
                initDataUnsafe: {
                    user?: ITelegramUser;
                    start_param?: string;
                };
                sendData: (data: string) => void;
                close: () => void;
                onEvent: (event: string, handler: () => void) => void;
                offEvent: (event: string, handler: () => void) => void;
                isExpanded?: boolean;
                expand: () => void;
                ready: () => void;
            };
        };
    }
}

export interface IPagination {
    totalCount: number
    maxPage: number
    currentPage: number
    limit: number
  }

export const appName = "SVD BASE BOT"

export const TelegramBot: string = "tem4ik_ru_bot"

export type userIdParam = number | string




export interface ApiRoute {
    instance: AxiosInstance,
    baseUrl: Object
}















