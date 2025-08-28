import { UsersService } from '@/users/users.service';
import { ConfigService } from '@nestjs/config';
import { Ctx, On, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { LocalizationService } from '../services/localization.service';
import { TelegramService } from '../telegram.service';

// Хранилище для переписки (в памяти, для тестового варианта)
interface ChatMessage {
    messageId: number;
    from: {
        id: number;
        first_name?: string;
        last_name?: string;
        username?: string;
    };
    text?: string;
    photo?: any[];
    video?: any;
    document?: any;
    voice?: any;
    audio?: any;
    timestamp: number;
    businessConnectionId?: string;
}

interface ChatHistory {
    chatId: number;
    messages: ChatMessage[];
    lastExportTime?: number;
}

// Простое хранилище в памяти (для тестового варианта)
const chatHistories = new Map<number, ChatHistory>();

// @UseGuards(UserCheckMiddleware)
@Update()
export class BusinessModeUpdate {
    constructor(
        protected readonly telegramService: TelegramService,
        protected readonly configService: ConfigService,
        protected readonly userService: UsersService,
        private readonly localizationService: LocalizationService,
    ) { }

    @On('business_message' as any)
    async onBusinessMessage(@Ctx() ctx: Context) {
        const msg = (ctx.update as any).business_message;

        console.log(msg)

        const from = msg.from;
        const chat = msg.chat;
        const chatId = chat.id;

        await this.saveMessageToHistory(msg, chatId);

        if (msg.text === 'инфо') {
            await this.sendUserInfo(ctx, chat, msg);
        }
        else if (msg.text === 'история') {
            await this.exportChatHistory(ctx, chatId, msg.business_connection_id);
        }

    }

    private async saveMessageToHistory(msg: any, chatId: number) {
        if (!chatHistories.has(chatId)) {
            chatHistories.set(chatId, {
                chatId,
                messages: []
            });
        }

        const history = chatHistories.get(chatId)!;

        const message: ChatMessage = {
            messageId: msg.message_id,
            from: msg.from,
            text: msg.text,
            photo: msg.photo,
            video: msg.video,
            document: msg.document,
            voice: msg.voice,
            audio: msg.audio,
            timestamp: Date.now(),
            businessConnectionId: msg.business_connection_id
        };

        history.messages.push(message);

        // Ограничиваем количество сообщений (последние 1000)
        if (history.messages.length > 1000) {
            history.messages = history.messages.slice(-1000);
        }

        console.log(`Сообщение сохранено для чата ${chatId}. Всего сообщений: ${history.messages.length}`);
    }

    private async sendUserInfo(ctx: Context, chat: any, msg: any) {
        const info = `
👤 Собеседник:
ID: ${chat.id}
Имя: ${chat.first_name || ''}
Фамилия: ${chat.last_name || ''}
Username: @${chat.username || 'нет'}

💬 Сообщение: ${msg.text}

📊 Статистика чата:
Всего сообщений: ${chatHistories.get(chat.id)?.messages.length || 0}
        `;

        await ctx.telegram.callApi('sendMessage', {
            business_connection_id: msg.business_connection_id,
            chat_id: msg.chat.id,
            text: info,
        } as any);
    }

    private async exportChatHistory(ctx: Context, chatId: number, businessConnectionId: string) {
        const history = chatHistories.get(chatId);

        if (!history || history.messages.length === 0) {
            await ctx.telegram.callApi('sendMessage', {
                business_connection_id: businessConnectionId,
                chat_id: chatId,
                text: '📭 История чата пуста',
            } as any);
            return;
        }

        try {
            // Создаем текстовый файл с историей
            const chatInfo = history.messages[0]?.from;
            const fileName = `chat_history_${chatInfo?.username || chatInfo?.id}_${Date.now()}.txt`;

            let fileContent = `=== ИСТОРИЯ ЧАТА ===\n`;
            fileContent += `Пользователь: ${chatInfo?.first_name || ''} ${chatInfo?.last_name || ''}\n`;
            fileContent += `Username: @${chatInfo?.username || 'нет'}\n`;
            fileContent += `ID: ${chatInfo?.id}\n`;
            fileContent += `Дата экспорта: ${new Date().toLocaleString('ru-RU')}\n`;
            fileContent += `Всего сообщений: ${history.messages.length}\n\n`;

            history.messages.forEach((msg, index) => {
                const date = new Date(msg.timestamp).toLocaleString('ru-RU');
                const sender = msg.from.first_name || msg.from.username || msg.from.id;

                fileContent += `[${date}] ${sender}:\n`;

                if (msg.text) {
                    fileContent += `${msg.text}\n`;
                } else if (msg.photo) {
                    fileContent += `[ФОТО] ${msg.photo.length} фото\n`;
                } else if (msg.video) {
                    fileContent += `[ВИДЕО]\n`;
                } else if (msg.document) {
                    fileContent += `[ДОКУМЕНТ] ${msg.document.file_name || 'Файл'}\n`;
                } else if (msg.voice) {
                    fileContent += `[ГОЛОСОВОЕ СООБЩЕНИЕ]\n`;
                } else if (msg.audio) {
                    fileContent += `[АУДИО]\n`;
                } else {
                    fileContent += `[МЕДИА ФАЙЛ]\n`;
                }
                fileContent += '\n';
            });

            // Отправляем файл
            const buffer = Buffer.from(fileContent, 'utf-8');
            await (ctx.telegram as any).sendDocument(
                chatId,
                { source: buffer, filename: fileName },
                {
                    business_connection_id: businessConnectionId,
                    caption: `📄 История чата (${history.messages.length} сообщений)`
                }
            );

            history.lastExportTime = Date.now();

        } catch (error) {
            console.error('Ошибка при экспорте истории:', error);
            await ctx.telegram.callApi('sendMessage', {
                business_connection_id: businessConnectionId,
                chat_id: chatId,
                text: '❌ Ошибка при экспорте истории чата',
            } as any);
        }
    }


}



