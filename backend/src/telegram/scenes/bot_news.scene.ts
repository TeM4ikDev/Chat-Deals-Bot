import { DatabaseService } from "@/database/database.service";
import { LocalizationService } from "@/telegram/services/localization.service";
import { TelegramService } from "@/telegram/telegram.service";
import { UsersService } from "@/users/users.service";
import { Injectable } from "@nestjs/common";
import { UserRoles } from "@prisma/client";
import { Ctx, Hears, On, Scene, SceneEnter, SceneLeave } from "nestjs-telegraf";
import { Scenes } from "telegraf";
import { SCENES } from "../constants/telegram.constants";
import { Language } from "../decorators/language.decorator";

export interface INewsData {
    step: number;
    messageToSend?: {
        messageId: number;
        chatId: string;
    };
    lastInstructionMessageId?: number;
    historyMessageId?: string;
    selectedUsers?: string[];
    sendMode?: 'all' | 'selected' | 'count';
    userCount?: number;
}

type NewsSceneSession = Scenes.SceneContext & {
    session: Scenes.SceneSessionData & {
        newsData?: INewsData;
        language?: string;
    };
};

@Injectable()
@Scene(SCENES.NEWS)
export class BotNewsScene {
    private static readonly CANCEL_TEXT = '🔴 Отменить — Cancel';
    private static readonly SEND_TO_ALL_TEXT = '📢 Отправить всем — Send to all';
    private static readonly PREVIEW_TEXT = '👁️ Предпросмотр — Preview';
    private static readonly HISTORY_TEXT = '📚 История — History';
    private static readonly NEW_MESSAGE_TEXT = '✍️ Новое сообщение — New message';
    private static readonly SELECT_USERS_TEXT = '👥 Выбрать пользователей — Select users';
    private static readonly SEND_COUNT_TEXT = '🔢 Отправить N пользователям — Send to N users';
    private static readonly BACK_TEXT = '🔙 Назад — Back';

    private language: string = 'ru';

    private static readonly KEYBOARDS = {
        CANCEL: [{ text: BotNewsScene.CANCEL_TEXT }],
        MAIN_MENU: [
            [{ text: BotNewsScene.NEW_MESSAGE_TEXT }],
            [{ text: BotNewsScene.HISTORY_TEXT }],
            [{ text: BotNewsScene.CANCEL_TEXT }]
        ],
        SEND_OPTIONS: [
            [{ text: BotNewsScene.PREVIEW_TEXT }],
            [{ text: BotNewsScene.SEND_TO_ALL_TEXT }],
            [{ text: BotNewsScene.SELECT_USERS_TEXT }],
            [{ text: BotNewsScene.SEND_COUNT_TEXT }],
            [{ text: BotNewsScene.CANCEL_TEXT }]
        ],
        BACK_ONLY: [
            [{ text: BotNewsScene.BACK_TEXT }],
            [{ text: BotNewsScene.CANCEL_TEXT }]
        ]
    };

    constructor(
        private readonly telegramService: TelegramService,
        private readonly localizationService: LocalizationService,
        private readonly usersService: UsersService,
        private readonly database: DatabaseService
    ) { }

    @SceneEnter()
    async onSceneEnter(@Ctx() ctx: NewsSceneSession, @Language() scene_lang: string) {
        this.language = scene_lang;

        // Проверяем права пользователя
        const user = await this.usersService.findUserByTelegramId(String(ctx.from?.id));
        if (!user || (user.role !== UserRoles.ADMIN && user.role !== UserRoles.SUPER_ADMIN)) {
            await ctx.reply('❌ У вас нет прав для отправки новостей');
            await ctx.scene.leave();
            return;
        }

        ctx.session.newsData = {
            step: 0 // Начинаем с главного меню
        };

        const message = await ctx.reply(
            '📰 *Отправка новостей*\n\n' +
            'Выберите действие:\n' +
            '• Создать новое сообщение\n' +
            '• Выбрать из истории сообщений\n\n' +
            'Поддерживаются любые типы сообщений: текст, фото, видео, документы, аудио и т.д.',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: BotNewsScene.KEYBOARDS.MAIN_MENU,
                    resize_keyboard: true
                }
            }
        );
        ctx.session.newsData.lastInstructionMessageId = message.message_id;
    }

    @Hears(BotNewsScene.CANCEL_TEXT)
    async onCancel(@Ctx() ctx: NewsSceneSession) {
        ctx.session.newsData = undefined;
        await ctx.scene.leave();

        await ctx.reply('❌ Отправка новостей отменена', {
            reply_markup: {
                remove_keyboard: true,
            },
        });
    }

    @Hears(BotNewsScene.NEW_MESSAGE_TEXT)
    async onNewMessage(@Ctx() ctx: NewsSceneSession) {
        const newsData = ctx.session.newsData;
        if (!newsData) return;

        newsData.step = 1;

        // Удаляем предыдущее сообщение с инструкциями
        if (newsData.lastInstructionMessageId) {
            try {
                await ctx.deleteMessage(newsData.lastInstructionMessageId);
            } catch (error) {
                console.log('Не удалось удалить предыдущее сообщение:', error);
            }
        }

        const message = await ctx.reply(
            '✍️ *Создание нового сообщения*\n\n' +
            'Отправьте или перешлите сообщение, которое хотите разослать всем пользователям бота.\n\n' +
            'Поддерживаются любые типы сообщений: текст, фото, видео, документы, аудио и т.д.',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [BotNewsScene.KEYBOARDS.CANCEL],
                    resize_keyboard: true
                }
            }
        );
        newsData.lastInstructionMessageId = message.message_id;
    }

    @Hears(BotNewsScene.HISTORY_TEXT)
    async onHistory(@Ctx() ctx: NewsSceneSession) {
        const newsData = ctx.session.newsData;
        if (!newsData) return;

        try {
            const history = await this.database.botNewsHistory.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' }
            });

            if (history.length === 0) {
                await ctx.reply('📚 История пуста. Сначала создайте и отправьте несколько сообщений.');
                return;
            }

            if (newsData.lastInstructionMessageId) {
                try {
                    await ctx.deleteMessage(newsData.lastInstructionMessageId);
                } catch (error) {
                    console.log('Не удалось удалить предыдущее сообщение:', error);
                }
            }

            let messageText = '📚 *История сообщений*\n\n';
            messageText += 'Выберите сообщение для повторной отправки:\n\n';

            const inlineKeyboard = [];
            for (let i = 0; i < history.length; i++) {
                const item = history[i];
                const date = new Date(item.createdAt).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                messageText += `${i + 1}. ${date}\n`;
                inlineKeyboard.push([{
                    text: `${i + 1}. ${date}`,
                    callback_data: `history_${item.id}`
                }]);
            }

            inlineKeyboard.push([{ text: '🔙 Назад', callback_data: 'back_to_main' }]);

            const message = await ctx.reply(messageText, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: inlineKeyboard
                }
            });

            newsData.lastInstructionMessageId = message.message_id;

        } catch (error) {
            await ctx.reply('❌ Ошибка при загрузке истории');
            console.error('History error:', error);
        }
    }

    @Hears(BotNewsScene.PREVIEW_TEXT)
    async onPreview(@Ctx() ctx: NewsSceneSession) {
        const newsData = ctx.session.newsData;
        if (!newsData || !newsData.messageToSend) {
            await ctx.reply('❌ Сначала отправьте сообщение для рассылки');
            return;
        }

        await ctx.reply('👁️ *Предпросмотр сообщения:*', { parse_mode: 'Markdown' });

        try {
            await ctx.telegram.copyMessage(
                ctx.chat.id,
                newsData.messageToSend.chatId,
                newsData.messageToSend.messageId
            );
        } catch (error) {
            await ctx.reply('❌ Не удалось отправить предпросмотр сообщения');
            console.error('Preview error:', error);
        }
    }

    @Hears(BotNewsScene.SELECT_USERS_TEXT)
    async onSelectUsers(@Ctx() ctx: NewsSceneSession) {
        const newsData = ctx.session.newsData;
        if (!newsData || !newsData.messageToSend) {
            await ctx.reply('❌ Сначала отправьте сообщение для рассылки');
            return;
        }

        newsData.sendMode = 'selected';
        newsData.selectedUsers = [];
        newsData.step = 3; // Шаг выбора пользователей

        // Удаляем предыдущее сообщение с инструкциями
        if (newsData.lastInstructionMessageId) {
            try {
                await ctx.deleteMessage(newsData.lastInstructionMessageId);
            } catch (error) {
                console.log('Не удалось удалить предыдущее сообщение:', error);
            }
        }

        const message = await ctx.reply(
            '👥 *Выбор пользователей*\n\n' +
            'Отправьте username пользователей (по одному на сообщение):\n' +
            '• Начинайте с @ (например: @username)\n' +
            '• Или отправьте Telegram ID (только цифры)\n\n' +
            'После добавления всех пользователей нажмите "Отправить выбранным"',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [
                        [{ text: '✅ Отправить выбранным' }],
                        [{ text: BotNewsScene.BACK_TEXT }],
                        [{ text: BotNewsScene.CANCEL_TEXT }]
                    ],
                    resize_keyboard: true
                }
            }
        );
        newsData.lastInstructionMessageId = message.message_id;
    }

    @Hears(BotNewsScene.SEND_COUNT_TEXT)
    async onSendCount(@Ctx() ctx: NewsSceneSession) {
        const newsData = ctx.session.newsData;
        if (!newsData || !newsData.messageToSend) {
            await ctx.reply('❌ Сначала отправьте сообщение для рассылки');
            return;
        }

        newsData.sendMode = 'count';
        newsData.step = 4; // Шаг ввода количества

        // Удаляем предыдущее сообщение с инструкциями
        if (newsData.lastInstructionMessageId) {
            try {
                await ctx.deleteMessage(newsData.lastInstructionMessageId);
            } catch (error) {
                console.log('Не удалось удалить предыдущее сообщение:', error);
            }
        }

        const message = await ctx.reply(
            '🔢 *Количество получателей*\n\n' +
            'Введите количество пользователей, которым отправить сообщение:\n' +
            '• Только цифры (например: 50)\n' +
            '• Сообщение будет отправлено первым N пользователям из базы',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [
                        [{ text: BotNewsScene.BACK_TEXT }],
                        [{ text: BotNewsScene.CANCEL_TEXT }]
                    ],
                    resize_keyboard: true
                }
            }
        );
        newsData.lastInstructionMessageId = message.message_id;
    }

    @Hears('✅ Отправить выбранным')
    async onSendToSelected(@Ctx() ctx: NewsSceneSession) {
        const newsData = ctx.session.newsData;
        if (!newsData || !newsData.messageToSend || !newsData.selectedUsers || newsData.selectedUsers.length === 0) {
            await ctx.reply('❌ Сначала выберите пользователей для отправки');
            return;
        }

        await this.performSend(ctx, newsData);
    }

    @Hears('📤 Отправить')
    async onSendByCount(@Ctx() ctx: NewsSceneSession) {
        const newsData = ctx.session.newsData;
        if (!newsData || !newsData.messageToSend || !newsData.userCount) {
            await ctx.reply('❌ Сначала укажите количество пользователей для отправки');
            return;
        }

        await this.performSend(ctx, newsData);
    }

    @Hears(BotNewsScene.BACK_TEXT)
    async onBack(@Ctx() ctx: NewsSceneSession) {
        const newsData = ctx.session.newsData;
        if (!newsData || !newsData.messageToSend) return;

        // Возвращаемся к выбору способа отправки
        newsData.step = 2;
        newsData.sendMode = undefined;
        newsData.selectedUsers = undefined;
        newsData.userCount = undefined;

        // Удаляем предыдущее сообщение с инструкциями
        if (newsData.lastInstructionMessageId) {
            try {
                await ctx.deleteMessage(newsData.lastInstructionMessageId);
            } catch (error) {
                console.log('Не удалось удалить предыдущее сообщение:', error);
            }
        }

        const messageText = '✅ *Сообщение получено!*\n\n' +
            'Выберите способ отправки:\n' +
            '• Предварительно просмотреть сообщение\n' +
            '• Отправить всем пользователям бота\n' +
            '• Выбрать конкретных пользователей\n' +
            '• Отправить определенному количеству людей';

        const newMessage = await ctx.reply(messageText, {
            parse_mode: 'Markdown',
            reply_markup: {
                keyboard: BotNewsScene.KEYBOARDS.SEND_OPTIONS,
                resize_keyboard: true
            }
        });

        newsData.lastInstructionMessageId = newMessage.message_id;
    }

    @Hears(BotNewsScene.SEND_TO_ALL_TEXT)
    async onSendToAll(@Ctx() ctx: NewsSceneSession) {
        const newsData = ctx.session.newsData;
        if (!newsData || !newsData.messageToSend) {
            await ctx.reply('❌ Сначала отправьте сообщение для рассылки');
            return;
        }

        newsData.sendMode = 'all';
        await this.performSend(ctx, newsData);
    }

    private async performSend(ctx: NewsSceneSession, newsData: INewsData) {
        let users: any[] = [];
        let sendModeText = '';

        try {
            if (newsData.sendMode === 'all') {
                const { users: allUsers } = await this.usersService.findAllUsers(1, 1000);
                users = allUsers;
                sendModeText = 'всем пользователям';
            } else if (newsData.sendMode === 'selected' && newsData.selectedUsers) {
                // Находим пользователей по username или telegramId
                for (const userIdentifier of newsData.selectedUsers) {
                    let user = null;
                    if (userIdentifier.startsWith('@')) {
                        user = await this.usersService.findUserByUsername(userIdentifier.slice(1));
                    } else if (/^\d+$/.test(userIdentifier)) {
                        user = await this.usersService.findUserByTelegramId(userIdentifier);
                    }
                    if (user) users.push(user);
                }
                sendModeText = `выбранным пользователям (${users.length})`;
            } else if (newsData.sendMode === 'count' && newsData.userCount) {
                const { users: allUsers } = await this.usersService.findAllUsers(1, newsData.userCount);
                users = allUsers.slice(0, newsData.userCount);
                sendModeText = `первым ${newsData.userCount} пользователям`;
            }

            if (users.length === 0) {
                await ctx.reply('❌ Не найдено пользователей для отправки');
                return;
            }

            await ctx.reply(`📤 Начинаю рассылку сообщения ${sendModeText}...`);

            let successCount = 0;
            let errorCount = 0;

            const successUsers = [];

            for (const user of users) {
                if (!user) continue;
                
                try {
                    await ctx.telegram.copyMessage(
                        user.telegramId,
                        newsData.messageToSend.chatId,
                        newsData.messageToSend.messageId,
                        {
                            disable_notification: true,
                        }
                    );
                    successUsers.push(user.telegramId);
                    successCount++;

                    // Небольшая задержка между отправками
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    errorCount++;
                    console.error(`Error sending to user ${user.telegramId}:`, error);
                }
            }

            // Сохраняем сообщение в историю только если это не из истории
            if (!newsData.historyMessageId) {
                try {
                    await this.database.botNewsHistory.create({
                        data: {
                            messageId: newsData.messageToSend.messageId.toString(),
                            chatId: newsData.messageToSend.chatId
                        }
                    });
                } catch (error) {
                    console.error('Error saving to history:', error);
                }
            }

            console.log(successUsers);

            await ctx.reply(
                `✅ *Рассылка завершена!*\n\n` +
                `📊 Статистика:\n` +
                `• Успешно отправлено: ${successCount}\n` +
                `• Ошибок: ${errorCount}\n` +
                `• Всего получателей: ${users.length}`,
                {
                    parse_mode: 'Markdown',
                }
            );

        } catch (error) {
            await ctx.reply('❌ Произошла ошибка при рассылке сообщений');
            console.error('Broadcast error:', error);
        }

        // Выходим из сцены после рассылки
        ctx.session.newsData = undefined;
        await ctx.reply('Рассылка завершена', {
            reply_markup: {
                remove_keyboard: true,
            },
        });
        await ctx.scene.leave();
    }

    @On('message')
    async onMessage(@Ctx() ctx: NewsSceneSession) {
        const newsData = ctx.session.newsData;
        if (!newsData) return;

        const message = ctx.message as any;
        const text = message.text;

        // Шаг 1: Получение сообщения для рассылки
        if (newsData.step === 1) {
            // Проверяем, есть ли контент в сообщении
            const hasContent = message.text || message.caption || message.photo || message.video || 
                              message.document || message.audio || message.voice || message.sticker || 
                              message.animation || message.video_note;

            if (!hasContent) {
                await ctx.reply('❌ Пожалуйста, отправьте сообщение с текстом или медиа для рассылки');
                return;
            }

            // Сохраняем ссылку на сообщение
            newsData.messageToSend = {
                messageId: message.message_id,
                chatId: String(ctx.chat.id)
            };

            newsData.step = 2;

            // Удаляем предыдущее сообщение с инструкциями
            if (newsData.lastInstructionMessageId) {
                try {
                    await ctx.deleteMessage(newsData.lastInstructionMessageId);
                } catch (error) {
                    console.log('Не удалось удалить предыдущее сообщение:', error);
                }
            }

            // Отправляем сообщение с кнопками для дальнейших действий
            const messageText = '✅ *Сообщение получено!*\n\n' +
                'Выберите способ отправки:\n' +
                '• Предварительно просмотреть сообщение\n' +
                '• Отправить всем пользователям бота\n' +
                '• Выбрать конкретных пользователей\n' +
                '• Отправить определенному количеству людей';

            const newMessage = await ctx.reply(messageText, {
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: BotNewsScene.KEYBOARDS.SEND_OPTIONS,
                    resize_keyboard: true
                }
            });

            newsData.lastInstructionMessageId = newMessage.message_id;
        }
        // Шаг 3: Выбор пользователей
        else if (newsData.step === 3) {
            if (!text) {
                await ctx.reply('❌ Пожалуйста, отправьте username или Telegram ID');
                return;
            }

            let userIdentifier = text.trim();
            
            // Проверяем формат
            if (!userIdentifier.startsWith('@') && !/^\d+$/.test(userIdentifier)) {
                await ctx.reply('❌ Неверный формат. Отправьте @username или Telegram ID (только цифры)');
                return;
            }

            // Добавляем пользователя в список
            if (!newsData.selectedUsers) {
                newsData.selectedUsers = [];
            }

            if (newsData.selectedUsers.includes(userIdentifier)) {
                await ctx.reply('⚠️ Этот пользователь уже добавлен в список');
                return;
            }

            newsData.selectedUsers.push(userIdentifier);

            // Показываем обновленный список
            const userList = newsData.selectedUsers.map((user, index) => `${index + 1}. ${user}`).join('\n');
            await ctx.reply(
                `✅ Пользователь добавлен!\n\n` +
                `📋 Список получателей (${newsData.selectedUsers.length}):\n${userList}\n\n` +
                `Продолжайте добавлять пользователей или нажмите "Отправить выбранным"`,
                {
                    reply_markup: {
                        keyboard: [
                            [{ text: '✅ Отправить выбранным' }],
                            [{ text: '🔙 Назад' }],
                            [{ text: '🔴 Отменить' }]
                        ],
                        resize_keyboard: true
                    }
                }
            );
        }
        // Шаг 4: Ввод количества пользователей
        else if (newsData.step === 4) {
            if (!text || !/^\d+$/.test(text)) {
                await ctx.reply('❌ Пожалуйста, введите только цифры (например: 50)');
                return;
            }

            const count = parseInt(text);
            if (count <= 0 || count > 10000) {
                await ctx.reply('❌ Количество должно быть от 1 до 10000');
                return;
            }

            newsData.userCount = count;

            // Удаляем предыдущее сообщение с инструкциями
            if (newsData.lastInstructionMessageId) {
                try {
                    await ctx.deleteMessage(newsData.lastInstructionMessageId);
                } catch (error) {
                    console.log('Не удалось удалить предыдущее сообщение:', error);
                }
            }

            const message = await ctx.reply(
                `🔢 *Подтверждение*\n\n` +
                `Отправить сообщение первым ${count} пользователям из базы?\n\n` +
                `Нажмите "Отправить" для подтверждения или "Назад" для изменения количества.`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        keyboard: [
                            [{ text: '📤 Отправить' }],
                            [{ text: '🔙 Назад' }],
                            [{ text: '🔴 Отменить' }]
                        ],
                        resize_keyboard: true
                    }
                }
            );
            newsData.lastInstructionMessageId = message.message_id;
        }
    }

    @On('callback_query')
    async onCallbackQuery(@Ctx() ctx: NewsSceneSession) {
        const callbackData = (ctx.callbackQuery as any)?.data;
        const newsData = ctx.session.newsData;

        if (!callbackData || !newsData) return;

        await ctx.answerCbQuery();

        if (callbackData === 'back_to_main') {
            // Возвращаемся в главное меню
            newsData.step = 0;

            if (newsData.lastInstructionMessageId) {
                try {
                    await ctx.deleteMessage(newsData.lastInstructionMessageId);
                } catch (error) {
                    console.log('Не удалось удалить предыдущее сообщение:', error);
                }
            }

            const message = await ctx.reply(
                '📰 *Отправка новостей*\n\n' +
                'Выберите действие:\n' +
                '• Создать новое сообщение\n' +
                '• Выбрать из истории сообщений\n\n' +
                'Поддерживаются любые типы сообщений: текст, фото, видео, документы, аудио и т.д.',
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        keyboard: BotNewsScene.KEYBOARDS.MAIN_MENU,
                        resize_keyboard: true
                    }
                }
            );
            newsData.lastInstructionMessageId = message.message_id;

        } else if (callbackData.startsWith('history_')) {
            // Выбрано сообщение из истории
            const historyId = callbackData.replace('history_', '');
            
            try {
                const historyItem = await this.database.botNewsHistory.findUnique({
                    where: { id: historyId }
                });

                if (!historyItem) {
                    await ctx.reply('❌ Сообщение из истории не найдено');
                    return;
                }

                // Сохраняем данные сообщения
                newsData.messageToSend = {
                    messageId: parseInt(historyItem.messageId),
                    chatId: historyItem.chatId
                };
                newsData.historyMessageId = historyId;
                newsData.step = 2;

                if (newsData.lastInstructionMessageId) {
                    try {
                        await ctx.deleteMessage(newsData.lastInstructionMessageId);
                    } catch (error) {
                        console.log('Не удалось удалить предыдущее сообщение:', error);
                    }
                }

                // Показываем кнопки для работы с выбранным сообщением
                const messageText = '✅ *Сообщение из истории выбрано!*\n\n' +
                    'Выберите способ отправки:\n' +
                    '• Предварительно просмотреть сообщение\n' +
                    '• Отправить всем пользователям бота\n' +
                    '• Выбрать конкретных пользователей\n' +
                    '• Отправить определенному количеству людей';

                const newMessage = await ctx.reply(messageText, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        keyboard: BotNewsScene.KEYBOARDS.SEND_OPTIONS,
                        resize_keyboard: true
                    }
                });

                newsData.lastInstructionMessageId = newMessage.message_id;

            } catch (error) {
                await ctx.reply('❌ Ошибка при загрузке сообщения из истории');
                console.error('History item error:', error);
            }
        }
    }

    @SceneLeave()
    async onSceneLeave(@Ctx() ctx: NewsSceneSession) {
        ctx.session.newsData = undefined;
    }
}
