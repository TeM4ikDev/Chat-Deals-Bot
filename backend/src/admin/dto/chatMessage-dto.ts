export interface CreateChatMessageDto {
    username: string

    newUserMessage: string;
    showNewUserInfo?: 'true' | 'false';
    rulesTelegramLink?: string;

    banWorlds?: string[];
}