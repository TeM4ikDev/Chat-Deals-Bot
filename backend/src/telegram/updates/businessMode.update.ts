import { ScamformService } from '@/scamform/scamform.service';
import { UsersService } from '@/users/users.service';
import { ConfigService } from '@nestjs/config';
import { Ctx, On, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { LocalizationService } from '../services/localization.service';
import { TelegramService } from '../telegram.service';


interface ITelegramUser {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
    is_premium?: boolean;
}

interface ChatMessage {
    messageId: number;
    from: ITelegramUser;
    date: number;
    businessConnectionId?: string;

    type: 'text' | 'photo' | 'video';
}

interface TextMessage extends ChatMessage {
    text: string;
    editedHistory: string[];
}

interface PhotoMessage extends ChatMessage {
    file_id: string;
    media_group_id?: string;
    caption?: string;
}

interface VideoMessage extends ChatMessage {
    file_id: string;
    media_group_id?: string;
    caption?: string;
}


interface ChatHistory {
    chatId: number;
    messages: ChatMessage[];
    lastExportTime?: number;
}

const chatHistories = new Map<number, ChatHistory>();

@Update()
export class BusinessModeUpdate {
    constructor(
        protected readonly telegramService: TelegramService,
        protected readonly configService: ConfigService,
        protected readonly userService: UsersService,
        private readonly localizationService: LocalizationService,
        private readonly scamFormService: ScamformService,
    ) { }



    // @On('sender_business_bot' as any)
    // async onSenderBusinessBot(@Ctx() ctx: Context) {
    //     console.log(ctx)
    // }


    @On('business_message' as any)
    async onBusinessMessage(@Ctx() ctx: Context) {
        // console.log(ctx)

        const msg = (ctx.update as any).business_message;
        const chat = msg.chat;
        const chatId = chat.id;

        const handleMessage = await this.handleBusinessMessage(ctx, msg, chatId);
        console.log('handleMessage', handleMessage)
        if (handleMessage) return

        await this.saveMessageToHistory(msg, chatId);
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

    private async handleBusinessMessage(ctx: Context, msg: any, chatId: number): Promise<boolean> {
        if (!msg.text) return false;

        const commandText = msg.text.toLowerCase();
        switch (commandText) {
            case 'инфо':
                await this.sendUserInfo(ctx, msg);
                return true;
            case 'история':
                await this.exportChatHistory(ctx, chatId, msg.business_connection_id);

            default: return false;
        }
    }


    private async saveMessageToHistory(msg: any, chatId: number) {
        if (!chatHistories.has(chatId)) {
            chatHistories.set(chatId, {
                chatId,
                messages: []
            });
        }

        const history = chatHistories.get(chatId);

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

        console.log(message);

        history.messages.push(message);

        // if (history.messages.length > 1000) {
        //     history.messages = history.messages.slice(-1000);
        // }

        console.log(`Сообщение сохранено для чата ${chatId}. Всего сообщений: ${history.messages.length}`);
    }

    private async sendUserInfo(ctx: Context, msg: any) {
        const { from, chat } = msg;

        const info = `
👤 Собеседник:
ID: ${chat.id}
Имя: ${chat.first_name || ''}
Фамилия: ${chat.last_name || ''}
Username: @${chat.username || 'нет'}
`;

        await ctx.telegram.callApi('sendMessage', {
            business_connection_id: (msg as any).business_connection_id,
            chat_id: chat.id,
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
                const alignment = msg.from.id !== chatId ? 'right' : 'left';
                htmlContent += `<div class='message ${alignment}'>`;
                htmlContent += `<div class='sender'>${msg.from.first_name || msg.from.username || 'Unknown'}</div>`;
                htmlContent += await this.generateHtmlForMessage(msg);
                htmlContent += `</div>`;
            }

            htmlContent += `</div></body></html>`;

            const buffer = Buffer.from(htmlContent, 'utf-8');
            await (ctx.telegram as any).sendDocument(
                chatId,
                { source: buffer, filename: 'chat_history.html' },
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

    private async generateHtmlForMessage(msg: ChatMessage): Promise<string> {
        let html = `<div class='message'>`;

        if (msg.type === 'text') {
            html += `<p>${(msg as TextMessage).text}</p>`;
        }

        if (msg.type === 'photo') {
            const photoMsg = msg as any;
            const fileUrl = await this.scamFormService.getFileUrl(photoMsg.file_id);
            if (fileUrl) {
                html += `<img src='${fileUrl}' alt='photo' />`;
            } else {
                html += `<p>[Photo not available]</p>`;
            }
        }

        if (msg.type === 'video') {
            const videoMsg = msg as any;
            const fileUrl = await this.scamFormService.getFileUrl(videoMsg.file_id);
            if (fileUrl) {
                html += `<video controls>
                            <source src='${fileUrl}' type='video/mp4'>
                            Your browser does not support the video tag.
                         </video>`;
            } else {
                html += `<p>[Video not available]</p>`;
            }
        }

        html += `</div>`;
        return html;
    }
}


// {
//     business_connection_id: 'jYNOkSg2kEkAEAAARE5ID4b1vZU',
//     message_id: 249276,
//     from: {
//       id: 1360482307,
//       is_bot: false,
//       first_name: 'Bruklin',
//       username: 'bruklinzz',
//       is_premium: true
//     },
//     chat: {
//       id: 1360482307,
//       first_name: 'Bruklin',
//       username: 'bruklinzz',
//       type: 'private'
//     },
//     date: 1756469926,
//     text: 'ыы'
//   }


// подврок 
// {
//     business_connection_id: 'jYNOkSg2kEkAEAAARE5ID4b1vZU',
//     message_id: 249417,
//     from: {
//       id: 2027571609,
//       is_bot: false,
//       first_name: 'Artem',
//       username: 'TeM4ik20',
//       language_code: 'pl',
//       is_premium: true
//     },
//     chat: {
//       id: 7640988442,
//       first_name: '𝑼𝒍𝒚𝒂𝒏𝒂',
//       username: 'Ulyanochka45',
//       type: 'private'
//     },
//     date: 1756475431,
//     gift: {
//       gift: { id: '5170233102089322756', sticker: [Object], star_count: 15 },
//       convert_star_count: 13
//     }
//   }



// кружки
// {
//   business_connection_id: 'jYNOkSg2kEkAEAAARE5ID4b1vZU',
//   message_id: 249202,
//   from: {
//     id: 2027571609,
//     is_bot: false,
//     first_name: 'Artem',
//     username: 'TeM4ik20',
//     language_code: 'pl',
//     is_premium: true
//   },
//   chat: {
//     id: 1360482307,
//     first_name: 'Bruklin',
//     username: 'bruklinzz',
//     type: 'private'
//   },
//   date: 1756466363,
//   video_note: {
//     duration: 2,
//     length: 400,
//     thumbnail: {
//       file_id: 'AAMCAgADGQMAAQPNcmixjLtYXzRmRiK44Nyv_C1K20ZmAAIGfQACWyyJSaMrVHjTEIq9AQAHbQADNgQ',
//       file_unique_id: 'AQADBn0AAlssiUly',
//       file_size: 16768,
//       width: 320,
//       height: 320
//     },
//     thumb: {
//       file_id: 'AAMCAgADGQMAAQPNcmixjLtYXzRmRiK44Nyv_C1K20ZmAAIGfQACWyyJSaMrVHjTEIq9AQAHbQADNgQ',
//       file_unique_id: 'AQADBn0AAlssiUly',
//       file_size: 16768,
//       width: 320,
//       height: 320
//     },
//     file_id: 'DQACAgIAAxkDAAEDzXJosYy7WF80ZkYiuODcr_wtSttGZgACBn0AAlssiUmjK1R40xCKvTYE',
//     file_unique_id: 'AgADBn0AAlssiUk',
//     file_size: 102575
//   }
// }


// vide
// 
// {
//   business_connection_id: 'jYNOkSg2kEkAEAAARE5ID4b1vZU',
//   message_id: 249253,
//   from: {
//     id: 1360482307,
//     is_bot: false,
//     first_name: 'Bruklin',
//     username: 'bruklinzz',
//     is_premium: true
//   },
//   chat: {
//     id: 1360482307,
//     first_name: 'Bruklin',
//     username: 'bruklinzz',
//     type: 'private'
//   },
//   date: 1756468633,
//   video: {
//     duration: 23,
//     width: 1940,
//     height: 1300,
//     file_name: 'Screen Recording 2024-12-24 190722.mp4',
//     mime_type: 'video/mp4',
//     thumbnail: {
//       file_id: 'AAMCAgADGQEAAQPNpWixlZicm4gIeotcoMLJzT7ma7eYAALYfQACWyyJSQdx3cQSlDZcAQAHbQADNgQ',
//       file_unique_id: 'AQAD2H0AAlssiUly',
//       file_size: 11794,
//       width: 320,
//       height: 214
//     },
//     thumb: {
//       file_id: 'AAMCAgADGQEAAQPNpWixlZicm4gIeotcoMLJzT7ma7eYAALYfQACWyyJSQdx3cQSlDZcAQAHbQADNgQ',
//       file_unique_id: 'AQAD2H0AAlssiUly',
//       file_size: 11794,
//       width: 320,
//       height: 214
//     },
//     file_id: 'BAACAgIAAxkBAAEDzaVosZWYnJuICHqLXKDCyc0-5mu3mAAC2H0AAlssiUkHcd3EEpQ2XDYE',
//     file_unique_id: 'AgAD2H0AAlssiUk',
//     file_size: 30524754
//   }
// }
let a


// фото
// {
//     business_connection_id: 'jYNOkSg2kEkAEAAARE5ID4b1vZU',
//     message_id: 249204,
//     from: {
//       id: 2027571609,
//       is_bot: false,
//       first_name: 'Artem',
//       username: 'TeM4ik20',
//       language_code: 'ru',
//       is_premium: true
//     },
//     chat: {
//       id: 1360482307,
//       first_name: 'Bruklin',
//       username: 'bruklinzz',
//       type: 'private'
//     },
//     date: 1756466417,
//     photo: [
//       {
//         file_id: 'AgACAgIAAxkDAAEDzXRosYzxG4UbOnmUQgABGon2q4oAAUCZAAKy-jEbWyyJSUdCXCWNTnZhAQADAgADcwADNgQ',
//         file_unique_id: 'AQADsvoxG1ssiUl4',
//         file_size: 1127,
//         width: 72,
//         height: 90
//       },
//       {
//         file_id: 'AgACAgIAAxkDAAEDzXRosYzxG4UbOnmUQgABGon2q4oAAUCZAAKy-jEbWyyJSUdCXCWNTnZhAQADAgADbQADNgQ',
//         file_unique_id: 'AQADsvoxG1ssiUly',
//         file_size: 14361,
//         width: 257,
//         height: 320
//       },
//       {
//         file_id: 'AgACAgIAAxkDAAEDzXRosYzxG4UbOnmUQgABGon2q4oAAUCZAAKy-jEbWyyJSUdCXCWNTnZhAQADAgADeAADNgQ',
//         file_unique_id: 'AQADsvoxG1ssiUl9',
//         file_size: 31489,
//         width: 539,
//         height: 672
//       }
//     ]
//   }



