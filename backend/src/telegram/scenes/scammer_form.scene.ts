import { ScamformService } from "@/scamform/scamform.service";
import { TelegramService } from "@/telegram/telegram.service";
import { Injectable } from "@nestjs/common";
import { Ctx, Hears, On, Scene, SceneEnter, SceneLeave } from "nestjs-telegraf";
import { Scenes } from "telegraf";
import { BOT_NAME, SCENES } from "../constants/telegram.constants";

export interface IScammerData {
    username?: string
    telegramId?: string

}

interface IScammerFormData {
    step: number;
    scammerData: IScammerData;
    description: string | null;
    media: Array<{ type: string; file_id: string }>;
    lastInstructionMessageId?: number;
    processedMediaGroups?: Set<string>;
}

type ScammerFormSession = Scenes.SceneContext & {
    session: Scenes.SceneSessionData & { scamForm?: IScammerFormData }
};

@Injectable()
@Scene(SCENES.SCAMMER_FORM)
export class ScammerFrom {

    constructor(
        private readonly scamformService: ScamformService,
        private readonly telegramService: TelegramService
    ) { }


    @SceneEnter()
    async onSceneEnter(@Ctx() ctx: ScammerFormSession) {
        ctx.session.scamForm = {
            step: 1,
            scammerData: {},
            description: null,
            media: [],
            processedMediaGroups: new Set()
        };

        const message = await ctx.reply(
            '⚡️ Оперативная подача жалоб.\n\n1 – Отправьте боту юзернейм мошенника, на которого поступает жалоба.',
            {
                reply_markup: {
                    keyboard: [
                        [{ text: '👤 Юзернейм отсутствует' }],
                        [{ text: '🔴 Отменить жалобу' }],
                    ],
                    resize_keyboard: true
                }
            }
        );

        ctx.session.scamForm.lastInstructionMessageId = message.message_id;
    }

    @Hears('🔴 Отменить жалобу')
    async onCancel(@Ctx() ctx: ScammerFormSession) {
        ctx.session.scamForm = undefined;
        await ctx.reply('❌ Жалоба отменена.', {
            reply_markup: {
                remove_keyboard: true,
                inline_keyboard: [
                    [
                        { text: '📁 Заполнить форму', callback_data: 'fill_form' }
                    ],
                ]
            },
        });
        await ctx.scene.leave();
    }

    @Hears('✅ Я закончил')
    async onFinish(@Ctx() ctx: ScammerFormSession) {
        const form = ctx.session.scamForm;
        if (!form || form.step !== 3) return;

        if (form.media.length < 2) {
            await ctx.reply('❗️ Необходимо отправить минимум 2 медиа файла.');
            return;
        }

        form.step = 4;

        if (form.lastInstructionMessageId) {
            try {
                await ctx.deleteMessage(form.lastInstructionMessageId);
            } catch (error) {
                console.log('Не удалось удалить предыдущее сообщение:', error);
            }
        }

        const mediaGroup = form.media.slice(0, 10).map((media, index) => ({
            type: media.type as 'photo' | 'video',
            media: media.file_id
        }));

        await ctx.replyWithMediaGroup(mediaGroup);

        const { username, telegramId } = form.scammerData
        
        let userInfo = '';
        if (username && telegramId) {
            userInfo = `@${username}
            [ID: ${telegramId}]`;
        } else if (username) {
            userInfo = `@${username}
            [ID: не указан]`;
        } else if (telegramId) {
            userInfo = `username не указан
            [ID: ${telegramId}]`;
        } else {
            userInfo = 'Информация не указана';
        }
        
        await ctx.reply(`💎 **@${BOT_NAME}**\n\n**Доказательства мошенничества**\n\n` +
            `Жалоба на пользователя:
            ${userInfo}\n\n` +
            `**Описание ситуации от пострадавшего:** ${form.description}\n\n` +
            `✅ В таком виде ваша жалоба будет отправлена модерации бота. Если вас все устраивает, не забудьте нажать на кнопку «Подтверждаю отправление»`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Подтверждаю отправление', callback_data: 'confirm_submission' }
                    ],
                    [
                        { text: '🔴 Заполнить жалобу заново', callback_data: 'restart_form' }
                    ]
                ]
            }
        });
    }

    @Hears('🔄 Отправить заново')
    async onResend(@Ctx() ctx: ScammerFormSession) {
        const form = ctx.session.scamForm;
        if (!form || form.step !== 3) return;

        form.media = [];
        form.processedMediaGroups = new Set();

        if (form.lastInstructionMessageId) {
            try {
                await ctx.deleteMessage(form.lastInstructionMessageId);
            } catch (error) {
                console.log('Не удалось удалить предыдущее сообщение:', error);
            }
        }

        const message = await ctx.reply(
            '⚡️ Оперативная подача жалоб.\n\n3 – Отправьте фото / видео доказательства мошенничества.\n\n🖼 Получено медиа: 0 / 10\n\n💡 Вы можете отправлять доказательства как медиа-группой, так и поштучно.',
            {
                reply_markup: {
                    keyboard: [
                        [{ text: '✅ Я закончил' }],
                        [{ text: '🔄 Отправить заново' }],
                        [{ text: '🔴 Отменить жалобу' }]
                    ],
                    resize_keyboard: true
                }
            }
        );

        form.lastInstructionMessageId = message.message_id;
    }

    @Hears('👤 Юзернейм отсутствует')
    async onUsernameMissing(@Ctx() ctx: ScammerFormSession) {
        await ctx.reply(
            '⚡️ Оперативная подача жалоб.\n\n1 – Отправьте боту Telegram ID мошенника цифрами, либо выберите чат с мошенником с помощью появившейся кнопки',
            {
                reply_markup: {
                    keyboard: [
                        [{
                            text: '👉 Выбрать мошенника',
                            request_user: {
                                request_id: 1,
                                user_is_bot: false
                            }
                        } as any],
                        [{ text: '🔴 Отменить жалобу' }]
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            }
        );
    }

    @Hears('👉 Выбрать мошенника')
    async onSelectScammer(@Ctx() ctx: ScammerFormSession) {
        // Эта кнопка уже содержит request_user, поэтому просто игнорируем нажатие
        // и ждем события user_shared
        return;
    }


    @On('callback_query')
    async onCallbackQuery(@Ctx() ctx: ScammerFormSession) {
        const callbackData = (ctx.callbackQuery as any)?.data;

        if (callbackData === 'back_to_username_step') {
            await ctx.answerCbQuery();
            await ctx.reply(
                '⚡️ Оперативная подача жалоб.\n\n1 – Отправьте боту Telegram ID мошенника цифрами, либо выберите чат с мошенником с помощью появившейся кнопки',
                {
                    reply_markup: {
                        keyboard: [
                            [{
                                text: '👉 Выбрать мошенника',
                                request_user: {
                                    request_id: 1,
                                    user_is_bot: false
                                }
                            } as any],
                            [{ text: '🔴 Отменить жалобу' }]
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true

                    }
                }
            );
        } else if (callbackData === 'confirm_submission') {
            await ctx.answerCbQuery();

            console.log(ctx.session.scamForm)

            // Создаем жалобу в базе данных
            const scamForm = await this.scamformService.create({
                scammerData: ctx.session.scamForm.scammerData,
                description: ctx.session.scamForm.description,
                media: ctx.session.scamForm.media,
                userTelegramId: String(ctx.from?.id)
            })

            // Отправляем в канал
            const channelId = '@qyqly'; // Замените на ваш канал
            const userInfo = ctx.from?.username ? `@${ctx.from.username}` : `ID: ${ctx.from?.id}`;
            
            // Формируем информацию о мошеннике как в пользовательском сообщении
            let scammerInfo = '';
            if (ctx.session.scamForm.scammerData.username && ctx.session.scamForm.scammerData.telegramId) {
                scammerInfo = `@${ctx.session.scamForm.scammerData.username}\n[ID: ${ctx.session.scamForm.scammerData.telegramId}]`;
            } else if (ctx.session.scamForm.scammerData.username) {
                scammerInfo = `@${ctx.session.scamForm.scammerData.username}\n[ID: не указан]`;
            } else if (ctx.session.scamForm.scammerData.telegramId) {
                scammerInfo = `username не указан\n[ID: ${ctx.session.scamForm.scammerData.telegramId}]`;
            } else {
                scammerInfo = 'Информация не указана';
            }
            
            const channelMessage = `💎 **@${BOT_NAME}**\n\n**Доказательства мошенничества**\n\n` +
                `Жалоба на пользователя:\n${scammerInfo}\n\n` +
                `**Описание ситуации от пострадавшего:** ${ctx.session.scamForm.description}\n\n` +
                `👤 **Отправитель:** ${userInfo}`;

            try {
                // Если есть медиафайлы, отправляем с медиа
                if (ctx.session.scamForm.media.length > 0) {
                    const mediaGroup = ctx.session.scamForm.media.slice(0, 10).map((media, index) => ({
                        type: media.type === 'photo' ? 'photo' : 'video',
                        media: media.file_id,
                        ...(index === 0 && { caption: channelMessage, parse_mode: 'Markdown' })
                    }));

                    await this.telegramService.sendMediaGroupToChannel(channelId, mediaGroup);
                } else {
                    // Если нет медиа, отправляем только текст
                    await this.telegramService.sendMessageToChannel(channelId, channelMessage, {
                        parse_mode: 'Markdown'
                    });
                }
            } catch (error) {
                console.error('Error sending to channel:', error);
            }

            await ctx.reply('✅ Жалоба успешно отправлена! Спасибо за вашу бдительность.', {
                reply_markup: {
                    remove_keyboard: true
                }
            });

            ctx.session.scamForm = undefined;
            await ctx.scene.leave();
        } else if (callbackData === 'restart_form') {
            await ctx.answerCbQuery();

            // Начинаем форму заново
            ctx.session.scamForm = {
                step: 1,
                scammerData: {},
                description: null,
                media: [],
                processedMediaGroups: new Set()
            };

            const message = await ctx.reply(
                '⚡️ Оперативная подача жалоб.\n\n1 – Отправьте боту юзернейм мошенника, на которого поступает жалоба.',
                {
                    reply_markup: {
                        keyboard: [
                            [{ text: '👤 Юзернейм отсутствует' }],
                            [{ text: '🔴 Отменить жалобу' }],
                        ],
                        resize_keyboard: true
                    }
                }
            );

            ctx.session.scamForm.lastInstructionMessageId = message.message_id;
        }
    }

    @On('text')
    async onText(@Ctx() ctx: ScammerFormSession) {
        const form = ctx.session.scamForm;
        if (!form) return;
        const text: string = (ctx.message as any)?.text;
        if (form.step === 1) {
            if (!text || (!text.startsWith('@') && !/\d+/.test(text))) {
                await ctx.reply('❗️ Пожалуйста, отправьте корректный юзернейм или Telegram ID.');
                return;
            }

    
            if (text.startsWith('@')) {
                form.scammerData.username = text.replace('@', '');
            } else {
                form.scammerData.telegramId = text;
            }

            form.step = 2;
            await ctx.reply(
                '⚡️ Оперативная подача жалоб.\n\n2 – Отправьте описание мошенничества (Ограничение 500 символов)',
                { reply_markup: { keyboard: [[{ text: '🔴 Отменить жалобу' }]], resize_keyboard: true } }
            );
            return;
        }
        if (form.step === 2) {
            if (!text || text.length > 500) {
                await ctx.reply('❗️ Описание слишком длинное. Максимум 500 символов.');
                return;
            }
            form.description = text;
            form.step = 3;

            const message = await ctx.reply(
                '⚡️ Оперативная подача жалоб.\n\n3 – Отправьте фото / видео доказательства мошенничества.\n\n🖼 Получено медиа: 0 / 10\n\n💡 Вы можете отправлять доказательства как медиа-группой, так и поштучно.',
                {
                    reply_markup: {
                        keyboard: [
                            [{ text: '✅ Я закончил' }],
                            [{ text: '🔄 Отправить заново' }],
                            [{ text: '🔴 Отменить жалобу' }]
                        ],
                        resize_keyboard: true
                    }
                }
            );

            form.lastInstructionMessageId = message.message_id;
            return;
        }
    }



    @On('message')
    async onMessage(@Ctx() ctx: ScammerFormSession) {
        const form = ctx.session.scamForm;
        if (!form) return;

        // Обработка выбранного пользователя (шаг 1)
        if (form.step === 1) {
            const userShared = (ctx.message as any)?.user_shared;
            if (userShared) {
                console.log('Выбран пользователь:', {
                    user_id: userShared.user_id,
                    request_id: userShared.request_id
                });

                console.log(userShared)

                form.scammerData.telegramId = userShared.user_id.toString();
                form.step = 2;

                await ctx.reply(
                    `✅ Пользователь выбран:\n\nID: ${userShared.user_id}\n\n⚡️ Оперативная подача жалоб.\n\n2 – Отправьте описание мошенничества (Ограничение 500 символов)`,
                    { reply_markup: { keyboard: [[{ text: '🔴 Отменить жалобу' }]], resize_keyboard: true } }
                );
                return;
            }
        }

        // Обработка пересланных сообщений (шаг 1)
        // if (form.step === 1) {
        //     const forwardedMessage = (ctx.message as any)?.forward_from;
        //     if (forwardedMessage) {
        //         const userInfo = `ID: ${forwardedMessage.id}\nИмя: ${forwardedMessage.first_name || 'Не указано'}\nUsername: ${forwardedMessage.username || 'Отсутствует'}`;
        //         form.username = `@${forwardedMessage.username}` || `ID:${forwardedMessage.id}`;
        //         form.step = 2;

        //         await ctx.reply(
        //             `✅ Пользователь выбран:\n\n${userInfo}\n\n⚡️ Оперативная подача жалоб.\n\n2 – Отправьте описание мошенничества (Ограничение 500 символов)`,
        //             { reply_markup: { keyboard: [[{ text: '🔴 Отменить жалобу' }]], resize_keyboard: true } }
        //         );
        //         return;
        //     }
        // }

        if (form.step === 3) {
            const hasPhoto = (ctx.message as any)?.photo;
            const hasVideo = (ctx.message as any)?.video;

            if (hasPhoto || hasVideo) {
                console.log('Получено медиа:', hasPhoto ? 'фото' : 'видео');

                let mediaCount = form.media.length;
                let shouldUpdateMessage = false;

                if (hasPhoto) {
                    const fileId = (ctx.message as any).photo[(ctx.message as any).photo.length - 1].file_id;
                    form.media.push({ type: 'photo', file_id: fileId });
                    mediaCount++;
                    shouldUpdateMessage = true;
                }

                if (hasVideo) {
                    form.media.push({ type: 'video', file_id: (ctx.message as any).video.file_id });
                    mediaCount++;
                    shouldUpdateMessage = true;
                }

                if (mediaCount > 10) {
                    await ctx.reply('❗️ Можно отправить не более 10 медиа.');
                    return;
                }

                const mediaGroupId = (ctx.message as any)?.media_group_id;

                if (shouldUpdateMessage && !mediaGroupId) {
                    if (form.lastInstructionMessageId) {
                        try {
                            await ctx.deleteMessage(form.lastInstructionMessageId);
                        } catch (error) {
                            console.log('Не удалось удалить предыдущее сообщение:', error);
                        }
                    }

                    const message = await ctx.reply(
                        `⚡️ Оперативная подача жалоб.\n\n3 – Отправьте фото / видео доказательства мошенничества.\n\n🖼 Получено медиа: ${mediaCount} / 10\n\n💡 Вы можете отправлять доказательства как медиа-группой, так и поштучно.`,
                        {
                            reply_markup: {
                                keyboard: [
                                    [{ text: '✅ Я закончил' }],
                                    [{ text: '🔄 Отправить заново' }],
                                    [{ text: '🔴 Отменить жалобу' }]
                                ],
                                resize_keyboard: true
                            }
                        }
                    );

                    form.lastInstructionMessageId = message.message_id;
                } else if (mediaGroupId) {
                    if (!form.processedMediaGroups) {
                        form.processedMediaGroups = new Set();
                    }

                    if (form.processedMediaGroups.has(mediaGroupId)) return
                    form.processedMediaGroups.add(mediaGroupId);

                    setTimeout(async () => {
                        if (form.step === 3) {
                            if (form.lastInstructionMessageId) {
                                try {
                                    await ctx.deleteMessage(form.lastInstructionMessageId);
                                } catch (error) {
                                    console.log('Не удалось удалить предыдущее сообщение:', error);
                                }
                            }

                            const message = await ctx.reply(
                                `⚡️ Оперативная подача жалоб.\n\n3 – Отправьте фото / видео доказательства мошенничества.\n\n🖼 Получено медиа: ${form.media.length} / 10\n\n💡 Вы можете отправлять доказательства как медиа-группой, так и поштучно.`,
                                {
                                    reply_markup: {
                                        keyboard: [
                                            [{ text: '✅ Я закончил' }],
                                            [{ text: '🔄 Отправить заново' }],
                                            [{ text: '🔴 Отменить жалобу' }]
                                        ],
                                        resize_keyboard: true
                                    }
                                }
                            );
                            form.lastInstructionMessageId = message.message_id;
                        }
                    }, 1000);
                }


            }
        }
    }

    @SceneLeave()
    async onSceneLeave(@Ctx() ctx: ScammerFormSession) {
        ctx.session.scamForm = undefined;
    }
}
