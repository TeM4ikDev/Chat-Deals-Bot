import { ScamformService } from "@/scamform/scamform.service";
import { LocalizationService } from "@/telegram/services/localization.service";
import { TelegramService } from "@/telegram/telegram.service";
import { Injectable } from "@nestjs/common";
import { Ctx, Hears, On, Scene, SceneEnter, SceneLeave } from "nestjs-telegraf";
import { Scenes } from "telegraf";
import { BOT_NAME, SCENES } from "../constants/telegram.constants";
import { Language } from "../decorators/language.decorator";

export interface IAppealUserData {
    username?: string;
    telegramId?: string;
}

interface IAppealFormData {
    step: number;
    userData: IAppealUserData;
    description: string | null;
    media: Array<{ type: string; file_id: string }>;
    lastInstructionMessageId?: number;
    processedMediaGroups?: Set<string>;
}

type AppealFormSession = Scenes.SceneContext & {
    session: Scenes.SceneSessionData & {
        appealForm?: IAppealFormData;
        language?: string;
    };
};

@Injectable()
@Scene(SCENES.APPEAL_FORM)
export class AppealForm {
    private static readonly NO_USERNAME_TEXT = '👤 Юзернейм отсутствует — Username is missing';
    private static readonly CANCEL_TEXT = '🔴 Отменить апелляцию — Cancel appeal';
    private static readonly SELECT_USER_TEXT = '👉 Выбрать пользователя — Select user';
    private static readonly DONE_TEXT = '✅ Я закончил — I am done';
    private static readonly RESEND_TEXT = '🔄 Отправить заново — Resend';

    private language: string = 'ru';
    private min_media = 2
    private max_media = 10

    private static readonly KEYBOARDS = {
        NO_USERNAME: [{ text: AppealForm.NO_USERNAME_TEXT }],
        CANCEL: [{ text: AppealForm.CANCEL_TEXT }],
        SELECT_USER: [{
            text: AppealForm.SELECT_USER_TEXT,
            request_user: {
                request_id: 1,
                user_is_bot: false
            }
        } as any],
        DONE: [{ text: AppealForm.DONE_TEXT }],
        RESEND: [{ text: AppealForm.RESEND_TEXT }]
    };

    constructor(
        private readonly scamformService: ScamformService,
        private readonly telegramService: TelegramService,
        private readonly localizationService: LocalizationService
    ) { }

    @SceneEnter()
    async onSceneEnter(@Ctx() ctx: AppealFormSession, @Language() scene_lang: string) {
        this.language = scene_lang

        ctx.session.appealForm = {
            step: 1,
            userData: {},
            description: null,
            media: [],
            processedMediaGroups: new Set()
        };

        const message = await ctx.reply(
            this.localizationService.getT('appeal.form.step1', this.language), {
            reply_markup: {
                keyboard: [
                    AppealForm.KEYBOARDS.NO_USERNAME,
                    AppealForm.KEYBOARDS.CANCEL,
                ],
                resize_keyboard: true
            }
        });
        ctx.session.appealForm.lastInstructionMessageId = message.message_id;
    }

    @Hears(AppealForm.CANCEL_TEXT)
    async onCancel(@Ctx() ctx: AppealFormSession) {
        ctx.session.appealForm = undefined;
        await ctx.reply(this.localizationService.getT('appeal.form.cancelled', this.language), {
            reply_markup: {
                remove_keyboard: true,
            },
        });
        await ctx.scene.leave();
    }

    @Hears(AppealForm.DONE_TEXT)
    async onFinish(@Ctx() ctx: AppealFormSession) {
        const form = ctx.session.appealForm;
        if (!form || form.step !== 3) return;

        if (form.media.length < this.min_media) {
            await ctx.reply(this.localizationService.getT('appeal.errors.minMedia', this.language));
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

        const mediaGroup = form.media.slice(0, this.max_media).map((media, index) => ({
            type: media.type as 'photo' | 'video',
            media: media.file_id
        }));

        await ctx.replyWithMediaGroup(mediaGroup);

        const { username, telegramId } = form.userData
        const userInfo = this.telegramService.formatUserInfo(username, telegramId, this.language);

        await ctx.reply(
            this.localizationService.getT('appeal.form.confirmation', this.language)
                .replace('{botName}', BOT_NAME)
                .replace('{userInfo}', userInfo)
                .replace('{description}', this.telegramService.escapeMarkdown(form.description) || ''), {

            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: this.localizationService.getT('appeal.form.confirmSubmission', this.language), callback_data: 'confirm_submission' }],
                    [{ text: this.localizationService.getT('appeal.form.restartForm', this.language), callback_data: 'restart_form' }]
                ]
            }
        });
    }

    @Hears(AppealForm.RESEND_TEXT)
    async onResend(@Ctx() ctx: AppealFormSession) {
        const form = ctx.session.appealForm;
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
            this.localizationService.getT('appeal.form.step3', this.language).replace('{count}', '0'), {
            reply_markup: {
                keyboard: [
                    AppealForm.KEYBOARDS.DONE,
                    AppealForm.KEYBOARDS.RESEND,
                    AppealForm.KEYBOARDS.CANCEL
                ],
                resize_keyboard: true
            }
        });

        form.lastInstructionMessageId = message.message_id;
    }

    @Hears(AppealForm.NO_USERNAME_TEXT)
    async onUsernameMissing(@Ctx() ctx: AppealFormSession) {
        await ctx.reply(
            this.localizationService.getT('appeal.form.step1SelectUser', this.language), {
            reply_markup: {
                keyboard: [
                    AppealForm.KEYBOARDS.SELECT_USER,
                    AppealForm.KEYBOARDS.CANCEL
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
    }

    @Hears(AppealForm.SELECT_USER_TEXT)
    async onSelectUser(@Ctx() ctx: AppealFormSession) {
        return;
    }

    @On('callback_query')
    async onCallbackQuery(@Ctx() ctx: AppealFormSession) {
        const callbackData = (ctx.callbackQuery as any)?.data;

        if (callbackData === 'back_to_username_step') {
            await ctx.answerCbQuery();
            await ctx.reply(
                this.localizationService.getT('appeal.form.step1SelectUser', this.language),
                {
                    reply_markup: {
                        keyboard: [
                            AppealForm.KEYBOARDS.SELECT_USER,
                            AppealForm.KEYBOARDS.CANCEL
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                }
            );
        } else if (callbackData === 'confirm_submission') {
            await ctx.answerCbQuery();

            const appealForm = await this.scamformService.createAppeal({
                userData: ctx.session.appealForm.userData,
                description: ctx.session.appealForm.description,
                media: ctx.session.appealForm.media,
                userTelegramId: String(ctx.from?.id)
            })

            await this.sendMessageToChannel(ctx)

            await ctx.reply(this.localizationService.getT('appeal.form.success', this.language), {
                reply_markup: {
                    remove_keyboard: true
                }
            });

            await ctx.scene.leave();
        } else if (callbackData === 'restart_form') {
            await ctx.answerCbQuery();

            ctx.session.appealForm = {
                step: 1,
                userData: {},
                description: null,
                media: [],
                processedMediaGroups: new Set()
            };

            const message = await ctx.reply(
                this.localizationService.getT('appeal.form.step1', this.language), {
                reply_markup: {
                    keyboard: [
                        AppealForm.KEYBOARDS.NO_USERNAME,
                        AppealForm.KEYBOARDS.CANCEL,
                    ],
                    resize_keyboard: true
                }
            });

            ctx.session.appealForm.lastInstructionMessageId = message.message_id;
        }
    }

    @On('text')
    async onText(@Ctx() ctx: AppealFormSession) {
        const form = ctx.session.appealForm;
        if (!form) return;

        const text: string = (ctx.message as any)?.text;
        if (form.step === 1) {
            const msg = ctx.message as any;
            const text = msg?.text;
            const forwardedMessage = msg?.forward_from;

            if (forwardedMessage) {
                form.userData.telegramId = forwardedMessage.id.toString();
                form.userData.username = forwardedMessage.username;
            } else if (text?.startsWith('@')) {
                form.userData.username = text.slice(1);
            } else if (/^\d+$/.test(text)) {
                form.userData.telegramId = text;
            } else {
                await ctx.reply(this.localizationService.getT('appeal.errors.invalidInput', this.language));
                return;
            }

            form.step = 2;
            await ctx.reply(
                this.localizationService.getT('appeal.form.step2', this.language),
                { reply_markup: { keyboard: [AppealForm.KEYBOARDS.CANCEL], resize_keyboard: true } }
            );
            return;
        }
        if (form.step === 2) {
            if (!text || text.length > 500) {
                await ctx.reply(this.localizationService.getT('appeal.errors.descriptionTooLong', this.language));
                return;
            }
            form.description = text;
            form.step = 3;

            const message = await ctx.reply(
                this.localizationService.getT('appeal.form.step3', this.language).replace('{count}', '0'), {
                reply_markup: {
                    keyboard: [
                        AppealForm.KEYBOARDS.DONE,
                        AppealForm.KEYBOARDS.RESEND,
                        AppealForm.KEYBOARDS.CANCEL
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
    async onMessage(@Ctx() ctx: AppealFormSession) {
        const form = ctx.session.appealForm;
        if (!form) return;

        if (form.step === 1) {
            const text = (ctx.message as any)?.text;
            const userSharedId = (ctx.message as any)?.user_shared?.user_id;

            if (userSharedId) {
                form.userData.telegramId = userSharedId.toString();
            } else {
                if (!text || (!text.startsWith('@') && !/^\d+$/.test(text))) {
                    await ctx.reply(this.localizationService.getT('appeal.errors.invalidUsernameOrId', this.language));
                    return;
                }

                if (text.startsWith('@')) {
                    form.userData.username = text.slice(1);
                } else {
                    form.userData.telegramId = text;
                }
            }

            form.step = 2;
            await ctx.reply(
                this.localizationService.getT('appeal.form.step2', this.language),
                { reply_markup: { keyboard: [AppealForm.KEYBOARDS.CANCEL], resize_keyboard: true } }
            );
            return;
        }

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

                if (mediaCount > this.max_media) {
                    await ctx.reply(this.localizationService.getT('appeal.errors.tooManyMedia', this.language));
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
                        this.localizationService.getT('appeal.form.step3', this.language).replace('{count}', mediaCount.toString()), {
                        reply_markup: {
                            keyboard: [
                                AppealForm.KEYBOARDS.DONE,
                                AppealForm.KEYBOARDS.RESEND,
                                AppealForm.KEYBOARDS.CANCEL
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
                                this.localizationService.getT('appeal.form.step3', this.language).replace('{count}', form.media.length.toString()), {
                                reply_markup: {
                                    keyboard: [
                                        AppealForm.KEYBOARDS.DONE,
                                        AppealForm.KEYBOARDS.RESEND,
                                        AppealForm.KEYBOARDS.CANCEL
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
    async onSceneLeave(@Ctx() ctx: AppealFormSession) {
        ctx.session.appealForm = undefined;
    }


    private async sendMessageToChannel(ctx: AppealFormSession) {
        const channelId = '@giftsstate';
        const userInfo = ctx.from?.username ? `@${this.telegramService.escapeMarkdown(ctx.from.username)}` : `ID: ${ctx.from?.id}`;

        const { username, telegramId } = ctx.session.appealForm.userData
        const appealUserInfo = this.telegramService.formatUserInfo(username, telegramId);
        const encoded = this.telegramService.encodeParams({ id: telegramId })
        const description = this.telegramService.escapeMarkdown(ctx.session.appealForm.description)

        const channelMessage = this.localizationService.getT('appeal.form.channelMessage', this.language)
            .replace('{botName}', BOT_NAME)
            .replace('{appealUserInfo}', appealUserInfo)
            .replace('{description}', description || '')
            .replace('{encoded}', encoded)
            .replace('{userInfo}', userInfo);

        try {
            if (ctx.session.appealForm.media.length > 0) {
                const mediaGroup = ctx.session.appealForm.media.slice(0, this.max_media).map((media, index) => ({
                    type: media.type === 'photo' ? 'photo' : 'video',
                    media: media.file_id,
                    ...(index === 0 && { caption: channelMessage, parse_mode: 'Markdown' })
                }));

                await this.telegramService.sendMediaGroupToChannel(channelId, mediaGroup);
            } else {
                await this.telegramService.sendMessageToChannelLayer(channelId, channelMessage, {
                    parse_mode: 'Markdown'
                });
            }
        } catch (error) {
            console.error('Error sending to channel:', error);
        }

    }
}
