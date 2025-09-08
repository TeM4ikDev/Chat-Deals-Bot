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

export const appName = "SVD BASE BOT"
export const TelegramBot: string = "tem4ik_ru_bot"
export type userIdParam = number | string

export interface IPagination {
    totalCount: number
    maxPage: number
    currentPage: number
    limit: number
}

interface ITelegramUserInfo{
    username: string
    telegramId: string
}

export interface IScammer {
    id: string
    telegramId: string
    username?: string
    twinAccounts: ITelegramUserInfo[]
    status: ScammerStatus
    scamForms: number
    marked: boolean
    createdAt: string
    description?: string
}

export interface IMedia {
    id: string
    fileId: string
    type: 'photo' | 'video'
    fileUrl?: string
}

export interface IScamForm {
    id: string
    description: string
    media: IMedia[]
    scammer: IScammer
    createdAt: string
    likes: number
    dislikes: number
}

export interface IVoteResponse {
    message: string
    isSuccess: boolean
    likes: number
    dislikes: number
    userVote: 'LIKE' | 'DISLIKE' | null
}

export interface ApiRoute {
    instance: AxiosInstance,
    baseUrl: Object
}

export interface IChatData {
    id: string
    username: string

    newUserMessage?: string
    rulesTelegramLink?: string
    showNewUserInfo: boolean

    autoMessageId?: string
    autoMessageIntervalSec?: number
    
    banWords: string[]
}

export enum voteType {
    Like = 'LIKE',
    Dislike = 'DISLIKE'
}

export enum ScammerStatus {
    SCAMMER = 'SCAMMER',
    UNKNOWN = 'UNKNOWN',
    SUSPICIOUS = 'SUSPICIOUS',
    SPAMMER = 'SPAMMER'
}















