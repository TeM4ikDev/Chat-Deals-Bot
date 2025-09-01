import { ITelegramUser } from "./types";

export interface ChatMessage {
    messageId: number;
    from: ITelegramUser;
    date: number;
    businessConnectionId?: string;

    type: 'text' | 'photo' | 'video';
}

export interface TextMessage extends ChatMessage {
    text: string;
    editedHistory: string[];
}

export interface PhotoMessage extends ChatMessage {
    file_id: string;
    media_group_id?: string;
    caption?: string;
}

export interface VideoMessage extends ChatMessage {
    file_id: string;
    media_group_id?: string;
    caption?: string;
}

export interface ChatHistory {
    chatUserInfo: ITelegramUser;
    userTelegramId: number; // telegramId of the user who is connected to the business bot
    messages: ChatMessage[];
    lastExportTime?: number;
}   