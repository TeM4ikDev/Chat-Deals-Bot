
import { DatabaseService } from '@/database/database.service';
import { ActionParam, ActionWithData } from '@/decorators/telegram.decorator';
import { ScamformService } from '@/scamform/scamform.service';
import { ChatHistory, ChatMessage, PhotoMessage, TextMessage, VideoMessage } from '@/types/businessChat';
import { ITelegramUser } from '@/types/types';
import { UsersService } from '@/users/users.service';
import { levenshtein, randElemFromArray } from '@/utils';
import { forwardRef, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessMeme, BusinessMemesGroup } from '@prisma/client';
import { Command, Ctx, InjectBot, On, Update } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { Chat, Message, ParseMode, Update as UpdateType } from 'telegraf/typings/core/types/typegram';
import youtubedl from 'youtube-dl-exec';
import { LocalizationService } from '../services/localization.service';
import { TelegramService } from '../telegram.service';


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
    }
}

const accessIds = ['2027571609', '1409479468'];

const BusinessMemes = [
    {
        groupName: 'рассказывай',
        urls: ['https://t.me/botmemesbase/3']
    },
    {
        groupName: 'нет!',
        urls: ['https://t.me/botmemesbase/4']
    },
    {
        groupName: 'мне лень фиксить',
        urls: ['https://t.me/botmemesbase/6']
    },
    {
        groupName: 'доброе утро',
        urls: ['https://t.me/botmemesbase/8']
    },
    {
        groupName: 'иди нахуй',
        urls: [
            'https://t.me/botmemesbase/9',
            'https://t.me/botmemesbase/33'
        ]
    },
    {
        groupName: 'орешки биг боб',
        urls: ['https://t.me/botmemesbase/10']
    },
    {
        groupName: 'бро',
        urls: ['https://t.me/botmemesbase/11']
    },
    {
        groupName: 'мачомэн',
        urls: [
            'https://t.me/botmemesbase/12',
            'https://t.me/botmemesbase/47',
            'https://t.me/botmemesbase/48',
            'https://t.me/botmemesbase/42',
            'https://t.me/botmemesbase/41',
            'https://t.me/botmemesbase/39',
            'https://t.me/botmemesbase/36',
            'https://t.me/botmemesbase/35',
            'https://t.me/botmemesbase/28',
            'https://t.me/botmemesbase/27',
            'https://t.me/botmemesbase/26',
            'https://t.me/botmemesbase/24',
            'https://t.me/botmemesbase/23',
            'https://t.me/botmemesbase/21'
        ]
    },
    {
        groupName: 'alex f',
        urls: ['https://t.me/botmemesbase/13']
    },
    {
        groupName: 'сигма',
        urls: [
            'https://t.me/botmemesbase/45',
            'https://t.me/botmemesbase/31'
        ]
    },
    {
        groupName: 'сегодня на занятом',
        urls: ['https://t.me/botmemesbase/16']
    },
    {
        groupName: 'нектаринки',
        urls: ['https://t.me/botmemesbase/17']
    },
    {
        groupName: 'дикий огурец',
        urls: ['https://t.me/botmemesbase/18']
    },
    {
        groupName: 'похуй',
        urls: ['https://t.me/botmemesbase/30']
    },
    {
        groupName: 'хм',
        urls: ['https://t.me/botmemesbase/40']
    },
    {
        groupName: 'иисус',
        urls: ['https://t.me/botmemesbase/32']
    },
    {
        groupName: 'гений',
        urls: ['https://t.me/botmemesbase/22']
    },
    {
        groupName: '67',
        urls: ['https://t.me/botmemesbase/61']
    }
];

const answersToQuestions = {
    'yes': [
        'https://t.me/botmemesbase/51',
        'https://t.me/botmemesbase/52',
        'https://t.me/botmemesbase/53',
    ],
    'no': [
        'https://t.me/botmemesbase/58',
        'https://t.me/botmemesbase/60',
    ],
    'no answer': [
        'https://t.me/botmemesbase/54',
        'https://t.me/botmemesbase/55',
        'https://t.me/botmemesbase/59',
    ],
}

const telegramIdsWithBusinessBot = new Set<number>([1360482307, 2027571609, 1409479468]);
const chatHistories = new Map<number, ChatHistory>();

export class BusinessMemesActions implements OnModuleInit {
    constructor(
        @InjectBot()
        protected readonly bot: Telegraf,
        private readonly database: DatabaseService
    ) { }

    async onModuleInit() {
        // await this.database.businessMemesGroup.deleteMany();
        // for (const group of BusinessMemes) {
        //     await this.addMemesGroup(group.groupName, group.urls);
        // }
    }

    async findMemesGroups() {
        return await this.database.businessMemesGroup.findMany({
            include: {
                BusinessMemes: true
            }
        });
    }

    async findMemesGroup(groupName: string): Promise<BusinessMemesGroup & { BusinessMemes: BusinessMeme[] } | null> {
        return await this.database.businessMemesGroup.findUnique({
            where: {
                groupName: groupName
            },
            include: {
                BusinessMemes: true
            }
        })
    }

    async addMemesGroup(groupName: string, urls: string[] = []) {
        const group = await this.findMemesGroup(groupName);
        if (group) {
            console.log(group.groupName + ' exists')
            return group
        }

        return await this.database.businessMemesGroup.create({
            data: {
                groupName: groupName,
                BusinessMemes: {
                    create: urls.map(url => ({
                        url: url
                    }))
                }
            }
        })
    }

    async addMemeToGroup(groupName: string, msg: Message.VideoMessage) {
        const sentMsg = await this.bot.telegram.sendVideo('@botmemesbase', msg.video.file_id)
        console.log(sentMsg)

        return await this.database.businessMeme.create({
            data: {
                url: `https://t.me/${(sentMsg.sender_chat as any).username}/${sentMsg.message_id}`,
                businessMemesGroup: {
                    connect: {
                        groupName: groupName
                    }
                }
            }
        })
    }

    async renameMemesGroup(groupName: string, newGroupName: string) {
        return await this.database.businessMemesGroup.update({
            where: {
                groupName: groupName
            },
            data: { groupName: newGroupName }
        })
    }

    async deleteMemeFromGroupById(groupName: string, id: string) {
        return await this.database.businessMeme.delete({
            where: {
                id: id
            }
        })

    }

    async deleteMemesGroup(groupName: string) {
        return await this.database.businessMemesGroup.delete({
            where: {
                groupName: groupName
            }
        })
    }
}

@Update()
export class BusinessMessageUpdate {
    constructor(
        @Inject(forwardRef(() => TelegramService))
        protected readonly telegramService: TelegramService,
        protected readonly configService: ConfigService,
        protected readonly userService: UsersService,
        private readonly localizationService: LocalizationService,
        private readonly businessMemesActions: BusinessMemesActions,


        @InjectBot()
        protected readonly bot: Telegraf,
    ) { }

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

        const msg = ctx.update.business_message;
        const chat = msg.chat as ITelegramUser;
        const chatId = chat.id;

        const handleMessage = await this.handleBusinessCommands(ctx, msg, chatId);
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

    async handleBusinessCommands(ctx: BusinessContext, msg: BusinessMessage, chatId: number): Promise<boolean> {
        if (!msg.text) return false;
        if (!telegramIdsWithBusinessBot.has(msg.from.id) || msg.from.id == msg.chat.id) return false;

        const commandText = msg.text.toLowerCase();

        switch (true) {
            case commandText == 'экспорт': {
                const memesGroups = await this.businessMemesActions.findMemesGroups();
                const memes = memesGroups.map(group => { return { groupName: group.groupName, url: group.BusinessMemes.map(meme => meme.url) } });
                const buffer = Buffer.from(JSON.stringify(memes, null, 2), 'utf-8');



                await this.bot.telegram.sendDocument(2027571609, {
                    source: buffer,
                    filename: 'memes.json',
                },
                    {
                        // caption: `📄 мемы`
                    })

                return true;
            }

            case commandText.startsWith('https://www.instagram.com/reel') || commandText.startsWith('https://youtube.com/shorts'): {
                try {


                    this.sendChatTextMessage(ctx, 'Скачиваю видео...')
                    // this.deleteMessage(ctx, msg)
                    // return

                    const videoInfo: any = await youtubedl(msg.text, {
                        dumpSingleJson: true,
                        cookies: './cookies.txt',
                        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        noCheckCertificates: true,
                        
                        // format: 'best',
                        proxy: 'socks5://dfgfg4ghjS:proxysoxybot@45.11.21.40:5501',
                        skipDownload: true,
                        ignoreErrors: true,
                        
                    },{
                        timeout: 10000,
                    });

                    console.log('Информация о видео:', videoInfo);

                    const videoUrl = videoInfo.url || videoInfo.formats?.[0]?.url;

                    if (videoUrl) {
                        await this.bot.telegram.sendVideo(msg.chat.id, videoUrl, {
                            business_connection_id: msg.business_connection_id,
                            caption: `📱 ${videoInfo.title || 'Instagram Reel'}`,
                            reply_to_message_id: msg.message_id,
                        } as any);

                        console.log("✅ Instagram Reel отправлен в чат!");
                    } else {
                        throw new Error('Не удалось получить URL видео');
                    }

                } catch (error) {
                    console.error("❌ Ошибка скачивания Instagram Reel:", error);
                    await this.sendChatTextMessage(ctx, `❌ Ошибка скачивания Instagram Reel: ${error instanceof Error ? error.message : String(error)}`);
                
                    throw error;
                }

                return true;
            }

            case commandText.startsWith('инфо'): {
                await this.sendUserInfo(ctx, msg);
                return true;
            }

            case commandText.startsWith('мемы'): {
                const memesGroups = await this.businessMemesActions.findMemesGroups();
                let memesText: string = 'Выберите мем(просто отправьте название):\n\n';
                memesGroups.forEach((memeGroup, index) => {
                    let memesUrls = '';
                    memeGroup.BusinessMemes.length > 0 ? (memeGroup.BusinessMemes).forEach((businessMeme, index) => {
                        const tab = (memeGroup.BusinessMemes).length == index + 1 ? '' : ' ';
                        memesUrls += `[${index + 1}](${businessMeme.url})${tab}`;
                    }) : memesUrls = 'нет мемов';
                    memesText += `${index + 1}. \`${memeGroup.groupName}\`(${memesUrls})\n`;
                });
                await this.sendChatTextMessage(ctx, memesText);
                return true;
            }

            case commandText.startsWith('+g'): {
                if (!this.checkIsUserHasAccess(accessIds, msg)) return false;

                const groupName = commandText.replace('+g', '').trim();
                if (!groupName) {
                    await this.sendChatTextMessage(ctx, 'Нужно указать название группы');
                    return true;
                }
                console.log(groupName)

                const existingGroup = await this.businessMemesActions.findMemesGroup(groupName);
                if (existingGroup) {
                    await this.sendChatTextMessage(ctx, 'Группа уже существует. Напиши +<название группы> для добавления мема в группу с ответом на видео');
                    return true;
                }

                const addedGroup = await this.businessMemesActions.addMemesGroup(groupName)
                if (addedGroup) {
                    await this.sendChatTextMessage(ctx, `Группа \`${groupName}\` создана`);
                }

                return true;
            }

            case commandText.startsWith('+m'): {
                if (!this.checkIsUserHasAccess(accessIds, msg)) return false

                const groupName = commandText.replace('+m', '').trim();
                const videoMsg: Message.VideoMessage = msg as any
                const replyToMessage = msg.reply_to_message;

                if (!groupName) {
                    await this.sendChatTextMessage(ctx, 'Нужно указать название группы');
                    return true;
                }

                if (!replyToMessage) {
                    await this.sendChatTextMessage(ctx, 'Нужно ответить на сообщение с мемом');
                    return true;
                }
                else if (!(replyToMessage as Message.VideoMessage).video) {
                    await this.sendChatTextMessage(ctx, 'Нужно ответить на сообщение с видео');
                    return true;
                }

                const existingGroup = await this.businessMemesActions.findMemesGroup(groupName);
                if (!existingGroup) {

                    const threshold = 4;
                    const memesGroups = await this.businessMemesActions.findMemesGroups();
                    for (const memeGroup of memesGroups) {
                        if (levenshtein(commandText, memeGroup.groupName) <= threshold) {
                            await this.sendChatTextMessage(ctx, `Группа не найдена. Возможно ты имел в виду группу \`${memeGroup.groupName}\` ?\nВ таком случае напиши \`+m${memeGroup.groupName}\` для добавления мема в группу`);
                            return true;
                        }
                    }


                    await this.sendChatTextMessage(ctx, 'Группа не найдена. Напиши `+g<название группы>` для создания новой группы');
                    return true;
                }

                console.log(msg.reply_to_message)
                const addedMeme = await this.businessMemesActions.addMemeToGroup(groupName, replyToMessage as Message.VideoMessage);
                console.log(addedMeme)

                if (addedMeme) {
                    await this.sendChatTextMessage(ctx, `[Мем](${addedMeme.url}) добавлен в группу \`${groupName}\``);
                }

                return true;
            }

            case commandText.startsWith('+r'): {
                if (!this.checkIsUserHasAccess(accessIds, msg)) return false
                const [groupName, newGroupName] = commandText.replace('+r', '').trim().toLowerCase().split(' ');

                console.log(groupName, newGroupName)

                if (!groupName || !newGroupName) {
                    await this.sendChatTextMessage(ctx, 'Нужно указать название группы и новое название');
                    return true;
                }

                if (groupName == newGroupName) {
                    await this.sendChatTextMessage(ctx, 'Название группы и новое название не могут быть одинаковыми');
                    return true;
                }

                const existingGroup = await this.businessMemesActions.findMemesGroup(groupName);
                const existingNewGroup = await this.businessMemesActions.findMemesGroup(newGroupName);

                if (!existingGroup) {
                    await this.sendChatTextMessage(ctx, 'Группа не найдена. Напиши `+g<название группы>` для создания новой группы ИЛИ `+r<название группы> <новое название>` для переименования группы');
                    return true;
                }

                if (existingNewGroup) {
                    await this.sendChatTextMessage(ctx, 'Группа с таким названием уже существует.');
                    return true;
                }

                await this.businessMemesActions.renameMemesGroup(groupName, newGroupName);
                await this.sendChatTextMessage(ctx, `Группа \`${groupName}\` переименована в \`${newGroupName}\``);
                return true;
            }

            case commandText.startsWith('+d'): {
                if (!this.checkIsUserHasAccess(accessIds, msg)) return false
                const [groupName, memeNumber] = commandText.replace('+d', '').trim().toLowerCase().split(' ');

                if (!groupName) {
                    await this.sendChatTextMessage(ctx, 'Нужно указать название группы для удаления');
                    return true;
                }

                const existingGroup = await this.businessMemesActions.findMemesGroup(groupName);

                if (!existingGroup) {
                    await this.sendChatTextMessage(ctx, 'Группа не найдена. Напиши `+g<название группы>` для создания новой группы ИЛИ `+d<название группы> <номер мема>` для удаления мема из группы');
                    return true;
                }

                if (memeNumber) {
                    if (existingGroup.BusinessMemes.length == 0) {
                        await this.sendChatTextMessage(ctx, 'Группа не содержит мемов');
                        return true;
                    }

                    const meme = existingGroup.BusinessMemes[Number(memeNumber) - 1];

                    if (!meme) {
                        await this.sendChatTextMessage(ctx, 'Мем не найден');
                        return true;
                    }

                    await this.businessMemesActions.deleteMemeFromGroupById(groupName, meme.id);
                    await this.sendChatTextMessage(ctx, `[Мем](${meme.url}) удален из группы \`${groupName}\``);
                    return true;
                }   
                else{
                    await this.businessMemesActions.deleteMemesGroup(groupName);
                    await this.sendChatTextMessage(ctx, `Группа \`${groupName}\` удалена`);
                    return true;
                }
            }

            case commandText === 'мудрый конь': {
                await this.sendChatTextMessage(
                    ctx,
                    'Мудрый конь слушает.\nНапиши: мудрый конь `<твой вопрос>`'
                );
                return true;
            }

            case commandText.includes('мудрый конь'): {

                const question = commandText.replace('мудрый конь ', '').trim();
                const chance = Math.random() * 100;

                let answer: keyof typeof answersToQuestions = null;
                switch (true) {
                    case chance < 33:
                        answer = 'yes';
                        break;
                    case chance < 66:
                        answer = 'no';
                        break;
                    case chance < 100:
                        answer = 'no answer';
                        break;
                }

                await this.handleAnswerToQuestion(ctx, answer, question);
                return true;
            }
        }

        await this.handleBusinessMemes(ctx, msg)
        return false;
    }

    async handleAnswerToQuestion(ctx: BusinessContext, answerType: keyof typeof answersToQuestions, question: string) {
        let answerTypeText: string = answerType;
        switch (answerType) {
            case 'yes':
                answerTypeText = 'да!';
                break;
            case 'no':
                answerTypeText = 'нет!';
                break;

            case 'no answer':
                answerTypeText = 'Я озадачен!';
                break;
        }

        const answer = randElemFromArray(answersToQuestions[answerType]);
        const caption = `\`${answerTypeText.toUpperCase()}\``;
        await this.sendMedia(ctx, answer, ctx.update.business_message, caption)
    }

    async handleBusinessMemes(ctx: BusinessContext, msg: BusinessMessage) {
        const memesGroups = await this.businessMemesActions.findMemesGroups();

        const [commandText, memeNumber] = msg.text.toLowerCase().split(' ');

        console.log(commandText, memeNumber)

        const threshold = 1;

        for (const memeGroup of memesGroups) {
            const memes = memeGroup.BusinessMemes.map(businessMeme => businessMeme.url);
            if (levenshtein(commandText, memeGroup.groupName) <= threshold) {
                await this.sendMedia(ctx, memeNumber ? memes[Number(memeNumber) - 1] : randElemFromArray(memes), msg);
                break;
            }
        }
    }

    async saveMessageToHistory(msg: any, chat: ITelegramUser) {
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

    async sendChatTextMessage(ctx: BusinessContext, text: string) {
        ctx.telegram.sendMessage(ctx.update.business_message.chat.id, text, {
            business_connection_id: ctx.update.business_message.business_connection_id,
            parse_mode: 'Markdown',
            link_preview_options: { is_disabled: true },
        } as ExtendedBusinessVideoMessageOptions)
    }

    async sendMedia(ctx: Context, source: string, msg: BusinessMessage, caption?: string) {
        await ctx.telegram.sendVideo(msg.chat.id, source, {
            business_connection_id: msg.business_connection_id,
            caption: caption,
            link_preview_options: { is_disabled: false },
            reply_to_message_id: msg.message_id,
            parse_mode: 'Markdown',
        } as ExtendedBusinessVideoMessageOptions)
    }

    async deleteMessage(ctx: BusinessContext, msg: BusinessMessage) {
        console.log(ctx.update, msg)
        // await ctx.telegram.callApi('deleteMessage', {
        //     chat_id: ctx.update.business_message.from.id,
        //     message_id: msg.message_id,
        //     // business_connection_id: msg.business_connection_id,
        // } as any) as any;

        await this.bot.telegram.deleteMessage(ctx.update.business_message.from.id, msg.message_id,)
    }

    async sendUserInfo(ctx: BusinessContext, msg: any) {
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

    checkIsUserHasAccess(accessIds: string[], msg: BusinessMessage) {
        if ((accessIds.includes(msg.from.id.toString()))) return true;
        return false;
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


// https://t.me/botmemesbase