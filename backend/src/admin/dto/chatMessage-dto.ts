export interface CreateChatMessageDto {
    chatUsername: string;
    message: string;
    showNewUserInfo?: 'true' | 'false';
    rulesTelegramLink?: string;
}