import { ActionParam, ActionWithData, getActionParams } from '@/decorators/telegram.decorator';
import { ScamformService } from '@/scamform/scamform.service';
import { ChatHistory, ChatMessage, PhotoMessage, TextMessage, VideoMessage } from '@/types/businessChat';
import { ITelegramUser } from '@/types/types';
import { UsersService } from '@/users/users.service';
import { forwardRef, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Action, Command, Ctx, On, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { LocalizationService } from '../services/localization.service';
import { TelegramService } from '../telegram.service';
import path from 'path';
import { Chat, Message, ParseMode, Update as UpdateType } from 'telegraf/typings/core/types/typegram';

interface ExtendedBusinessVideoMessageOptions extends Message.VideoMessage {
    parse_mode: ParseMode;
    business_connection_id: string;
    message_id: number;
    reply_to_message_id: number;
    chat: Chat;
}

interface BusinessMessage extends Message.TextMessage {
    business_connection_id: string;
}

interface BusinessContext extends Context {
    update: UpdateType & {
        business_message?: BusinessMessage;
    };
    // business_message: BusinessMessage;

}

enum BusinessMemes {
    'рассказывай' = 'https://t.me/botmemesbase/3',
    'нет!' = 'https://t.me/botmemesbase/4',
    'мне лень фиксить' = 'https://t.me/botmemesbase/6',
    'доброе утро' = 'https://t.me/botmemesbase/8',
    'иди нахуй' = 'https://t.me/botmemesbase/9',
    'орешки биг боб' = 'https://t.me/botmemesbase/10',
    'бро' = 'https://t.me/botmemesbase/11',
    'мачомэн' = 'https://t.me/botmemesbase/12',
    'alex f' = 'https://t.me/botmemesbase/13',
    'сегодня на занятом' = 'https://t.me/botmemesbase/15',
    'нектаринки' = 'https://t.me/botmemesbase/17',
    'дикий огурец' = 'https://t.me/botmemesbase/18',

}


const telegramIdsWithBusinessBot = new Set<number>([1360482307, 2027571609]);
const chatHistories = new Map<number, ChatHistory>();

chatHistories.set(1360482307, {
    userTelegramId: 2027571609,
    chatUserInfo: {
        id: 1360482307,
        first_name: 'Bruklin',
        username: 'bruklinzz',
    },
    messages: [

    ],
});

@Update()
export class BusinessMessageUpdate {
    constructor(
        @Inject(forwardRef(() => TelegramService))
        protected readonly telegramService: TelegramService,
        protected readonly configService: ConfigService,
        protected readonly userService: UsersService,
        private readonly localizationService: LocalizationService,
    ) { }

    //     id: 'EgCyyIuTmEktEAAARkFNHRnPEzQ',
    //     user: {
    //       id: 2027571609,
    //       is_bot: false,
    //       first_name: 'Artem',
    //       username: 'TeM4ik20',
    //       language_code: 'ru',
    //       is_premium: true
    //     },
    //     user_chat_id: 2027571609,
    //     date: 1756563297,
    //     is_enabled: true,
    //     can_reply: false,
    //     rights: {}
    //   }

    @On('business_connection' as any)
    async onBusinessConnection(@Ctx() ctx: Context) {
        const msg = (ctx.update as any).business_connection;
        console.log(msg)

        if (msg.is_enabled) {
            ctx.telegram.sendMessage(msg.user_chat_id, 'Спасибо за подключение бизнес бота, пупсик')
            telegramIdsWithBusinessBot.add(msg.user_chat_id);
        } else {
            ctx.telegram.sendMessage(msg.user_chat_id, 'Бизнес бот отключен, я злой')
            telegramIdsWithBusinessBot.delete(msg.user_chat_id);
        }
    }

    @On('business_message' as any)
    async onBusinessMessage(@Ctx() ctx: BusinessContext) {
        // console.log(ctx)

        const msg = ctx.update.business_message;
        const chat = msg.chat as ITelegramUser;
        const chatId = chat.id;

        // console.log(msg)
        const handleMessage = await this.handleBusinessMessage(ctx, msg, chatId);
        if (handleMessage) return

        await this.saveMessageToHistory(msg, chat);
    }

    @On('edited_business_message' as any)
    async onEditMessageText(@Ctx() ctx: Context) {
        const msg = (ctx.update as any).edited_business_message;
        console.log(msg)
    }

    @On('deleted_business_message' as any)
    async onDeletedBusinessMessage(@Ctx() ctx: Context) {
        console.log(ctx)
    }

    private async handleBusinessMessage(ctx: BusinessContext, msg: any, chatId: number): Promise<boolean> {
        if (!msg.text) return false;
        console.log(msg.from.id, msg.chat.id)
        if (!telegramIdsWithBusinessBot.has(msg.from.id) || msg.from.id == msg.chat.id) return false;

        const commandText = msg.text.toLowerCase();

        await this.handleBusinessMemes(ctx, msg);


        switch (commandText) {
            case 'инфо':
                await this.sendUserInfo(ctx, msg);
                return true;

            case 'мемы':
                const memes = Object.keys(BusinessMemes);
                let memesText: string = 'Выберите мем(просто отправьте название):\n\n';
                memes.forEach((meme, index) => {
                    memesText += `[${index + 1}. ${meme}](${BusinessMemes[meme]})\n`;
                });
                await this.sendChatTextMessage(ctx, memesText);
                return true;

            default: return false;
        }

    }

    async handleBusinessMemes(ctx: BusinessContext, msg: BusinessMessage) {
        const commandText = msg.text.toLowerCase();
        if (BusinessMemes[commandText]) {
            await this.sendMedia(ctx, BusinessMemes[commandText], msg);
        }
    }

    private async saveMessageToHistory(msg: any, chat: ITelegramUser) {
        // console.log(chat.id)
        if (!chatHistories.has(chat.id)) {
            chatHistories.set(chat.id, {
                userTelegramId: null,
                chatUserInfo: chat,
                messages: []
            });
        }

        const history = chatHistories.get(chat.id);

        if (!history.userTelegramId) {
            let userTelegramId = null;
            if (msg.from.id != msg.chat.id) {
                userTelegramId = msg.from.id;
            }

            console.log(userTelegramId)
            history.userTelegramId = userTelegramId;
        }


        let message: ChatMessage = {
            messageId: msg.message_id,
            from: msg.from,
            date: msg.date,
            businessConnectionId: msg.business_connection_id,
            type: 'text',
        };

        if (msg.text) {
            message = {
                ...message,
                text: msg.text,
                type: 'text',
                editedHistory: [],
            } as TextMessage;
        } else if (msg.photo) {
            message = {
                ...message,
                file_id: msg.photo[msg.photo.length - 1].file_id,
                media_group_id: msg?.media_group_id,
                caption: msg?.caption,
                type: 'photo',
            } as PhotoMessage;
        } else if (msg.video) {
            message = {
                ...message,
                file_id: msg.video.file_id,
                media_group_id: msg?.media_group_id,
                caption: msg?.caption,
                type: 'video',
            } as VideoMessage;
        }




        history.messages.push(message);

        // if (history.messages.length > 1000) {
        //     history.messages = history.messages.slice(-1000);
        // }

        console.log(`Сообщение сохранено для чата ${chat.id}. Всего сообщений: ${history.messages.length}`);
    }


    private async sendChatTextMessage(ctx: BusinessContext, text: string) {

        // console.log(ctx)
        ctx.telegram.sendMessage(ctx.update.business_message.chat.id, text, {
            business_connection_id: ctx.update.business_message.business_connection_id,
            parse_mode: 'Markdown',
            link_preview_options: { is_disabled: true },
        } as ExtendedBusinessVideoMessageOptions)
    }

    private async sendMedia(ctx: Context, source: string, msg: BusinessMessage) {
        ctx.telegram.sendVideo(msg.chat.id, source, {
            business_connection_id: msg.business_connection_id,
            link_preview_options: { is_disabled: false },
            reply_to_message_id: msg.message_id,
        } as ExtendedBusinessVideoMessageOptions)
    }

    private async sendUserInfo(ctx: BusinessContext, msg: any) {
        const { from, chat } = msg;

        const info = `
👤 Собеседник:
ID: ${chat.id}
Имя: ${chat.first_name || ''}
Фамилия: ${chat.last_name || ''}
Username: @${chat.username || 'нет'}
`;

        await ctx.telegram.callApi('sendMessage', {
            business_connection_id: msg.business_connection_id,
            chat_id: chat.id,
            text: info,
        } as any);
    }
}

@Update()
export class BusinessModeUpdate {
    constructor(
        @Inject(forwardRef(() => TelegramService))
        protected readonly telegramService: TelegramService,
        protected readonly configService: ConfigService,
        protected readonly userService: UsersService,
        @Inject(forwardRef(() => ScamformService))
        private readonly scamFormService: ScamformService,
    ) { }

    @Command('business_mode')
    async onBusinessMode(@Ctx() ctx: Context) {
        console.log(ctx.chat.id)

        console.log(Array.from(chatHistories.values())[1])
        const userChats = Array.from(chatHistories.values()).filter(chat => chat.userTelegramId == ctx.chat.id).map(chat => chat.chatUserInfo);

        // TEM4iKTESTERBOT
        // svdbasebot
        let replyText = ''
        userChats.forEach((chat, index) => {
            replyText += `${index + 1}. ${this.telegramService.formatUserLink(chat.id, chat.first_name, chat.username)} [просмотреть действия](https://t.me/svdbasebot?start=chatActions_${chat.id}) \n`
        })

        await ctx.reply(replyText || 'Не найдено чатов', {
            parse_mode: 'Markdown',
            link_preview_options: { is_disabled: true }
        })
    }

    async onChatActions(ctx: Context, exportChatId: number) {
        const history = chatHistories.get(exportChatId);
        if (!history) {
            await ctx.reply('Чат не найден')
            return
        }

        await ctx.reply(
            `Чат: ${this.telegramService.formatUserLink(exportChatId, history.chatUserInfo.first_name, history.chatUserInfo.username)} \n` +
            `Количество сообщений: ${history.messages.length}`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Отправить жалобу', callback_data: `sendComplaint:${exportChatId}` }],
                        [{ text: 'Скачать историю чата', callback_data: `downloadChat:${exportChatId}` }],
                    ]
                },
                parse_mode: 'Markdown',
                link_preview_options: { is_disabled: true }
            })
    }

    @ActionWithData('sendComplaint')
    async sendComplaint(@Ctx() ctx: Context, @ActionParam(0) exportChatId: number) {
        await ctx.reply('Пока в разработке.....')
        // await this.sendComplaint(ctx, parseInt(exportChatId));
        await ctx.answerCbQuery();
    }

    @ActionWithData('downloadChat')
    async downloadChat(@Ctx() ctx: Context, @ActionParam(0) exportChatId: string) {
        await this.exportChatHistory(ctx, parseInt(exportChatId));
        await ctx.answerCbQuery();
    }

    async exportChatHistory(ctx: Context, exportChatId: number) {
        const history = chatHistories.get(exportChatId);

        if (!history || history.messages.length === 0) {
            await ctx.reply('История чата пуста')
            return;
        }

        try {
            let htmlContent = `<!DOCTYPE html>
<html lang='ru'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>История чата</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f0f0f0; margin: 0; padding: 20px; }
        .chat-container { max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); overflow: hidden; }
        .message { margin: 5px; padding: 2px; border-radius: 5px; position: relative; max-width: 80%; }
        .message p { margin: 0; }
        .message img, .message video { max-width: 100%; height: auto; border-radius: 5px; }
        .message img { max-height: 200px; }
        .message video { max-height: 300px; }
        .message.left { background-color: #e1ffc7; margin-left: 10px; }
        .message.right { background-color: #c7e1ff; margin-left: auto; margin-right: 10px; }
        .message.left:after { content: ''; position: absolute; top: 10px; left: -10px; width: 0; height: 0; border-top: 10px solid transparent; border-right: 10px solid #e1ffc7; border-bottom: 10px solid transparent; }
        .message.right:after { content: ''; position: absolute; top: 10px; right: -10px; width: 0; height: 0; border-top: 10px solid transparent; border-left: 10px solid #c7e1ff; border-bottom: 10px solid transparent; }
        .sender { font-weight: bold; margin-bottom: 5px; }
    </style>
</head>
<body>
    <div class='chat-container'>`;

            for (const msg of history.messages) {
                const alignment = msg.from.id !== exportChatId ? 'right' : 'left';
                htmlContent += `<div class='message ${alignment}'>`;
                htmlContent += `<div class='sender'>${msg.from.first_name || msg.from.username || 'Unknown'}</div>`;
                htmlContent += await this.generateHtmlForMessage(msg);
                htmlContent += `</div>`;
            }

            htmlContent += `</div></body></html>`;

            const buffer = Buffer.from(htmlContent, 'utf-8');
            await ctx.telegram.sendDocument(ctx.chat.id, {
                source: buffer,
                filename: 'chat_history.html',

            }, {
                caption: `📄 История чата (${history.messages.length} сообщений)`

            }
            );
        } catch (error) {
            console.error('Error exporting chat history:', error);
            await ctx.reply('Произошла ошибка при экспорте истории чата.');
        }
    }

    private async generateHtmlForMessage(msg: ChatMessage) {
        let html = '';
        if ('text' in msg) {
            html += `<p>${(msg as TextMessage).text}</p>`;
        } else if ('file_id' in msg) {
            const fileUrl = await this.scamFormService.getFileUrl((msg as any).file_id);
            if (fileUrl) {
                html += `<img src='${fileUrl}' alt='photo' />`;
            } else {
                html += `<p>[Photo not available]</p>`;
            }
        }
        return html;
    }
}