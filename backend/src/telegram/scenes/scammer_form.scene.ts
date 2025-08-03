import { ScamformService } from "@/scamform/scamform.service";
import { LocalizationService } from "@/telegram/services/localization.service";
import { TelegramService } from "@/telegram/telegram.service";
import { Injectable } from "@nestjs/common";
import { Ctx, Hears, On, Scene, SceneEnter, SceneLeave } from "nestjs-telegraf";
import { Scenes } from "telegraf";
import { BOT_NAME, SCENES } from "../constants/telegram.constants";
import { Language } from "../decorators/language.decorator";

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
    session: Scenes.SceneSessionData & {
        scamForm?: IScammerFormData;
        language?: string;
    }
};

@Injectable()
@Scene(SCENES.SCAMMER_FORM)
export class ScammerFrom {
    private static readonly NO_USERNAME_TEXT = '👤 Юзернейм отсутствует — Username is missing';
    private static readonly CANCEL_TEXT = '🔴 Отменить жалобу — Cancel complaint';
    private static readonly SELECT_USER_TEXT = '👉 Выбрать мошенника — Select scammer';
    private static readonly DONE_TEXT = '✅ Я закончил — I am done';
    private static readonly RESEND_TEXT = '🔄 Отправить заново — Resend';

    private language: string = 'ru';
    private need_media = 0

    private static readonly KEYBOARDS = {
        NO_USERNAME: [{ text: ScammerFrom.NO_USERNAME_TEXT }],
        CANCEL: [{ text: ScammerFrom.CANCEL_TEXT }],
        SELECT_USER: [{
            text: ScammerFrom.SELECT_USER_TEXT,
            request_user: {
                request_id: 1,
                user_is_bot: false
            }
        } as any],
        DONE: [{ text: ScammerFrom.DONE_TEXT }],
        RESEND: [{ text: ScammerFrom.RESEND_TEXT }]
    };

    constructor(
        private readonly scamformService: ScamformService,
        private readonly telegramService: TelegramService,
        private readonly localizationService: LocalizationService
    ) { }

    @SceneEnter()
    async onSceneEnter(@Ctx() ctx: ScammerFormSession, @Language() scene_lang: string) {
        this.language = scene_lang

        ctx.session.scamForm = {
            step: 1,
            scammerData: {},
            description: null,
            media: [],
            processedMediaGroups: new Set()
        };

        const message = await ctx.reply(
            this.localizationService.getT('complaint.form.step1', this.language), {
            reply_markup: {
                keyboard: [
                    ScammerFrom.KEYBOARDS.NO_USERNAME,
                    ScammerFrom.KEYBOARDS.CANCEL,
                ],
                resize_keyboard: true
            }
        });
        ctx.session.scamForm.lastInstructionMessageId = message.message_id;
    }

    @Hears(ScammerFrom.CANCEL_TEXT)
    async onCancel(@Ctx() ctx: ScammerFormSession) {
        ctx.session.scamForm = undefined;
        await ctx.reply(this.localizationService.getT('complaint.form.cancelled', this.language), {
            reply_markup: {
                remove_keyboard: true,
            },
        });
        await ctx.scene.leave();
    }

    @Hears(ScammerFrom.DONE_TEXT)
    async onFinish(@Ctx() ctx: ScammerFormSession) {
        const form = ctx.session.scamForm;
        if (!form || form.step !== 3) return;

        if (form.media.length < this.need_media) {
            await ctx.reply(this.localizationService.getT('complaint.errors.minMedia', this.language));
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

        if (mediaGroup.length > 0) {
            await ctx.replyWithMediaGroup(mediaGroup);

        }


        const { username, telegramId } = form.scammerData

        const userInfo = this.telegramService.formatUserInfo(username, telegramId, this.language);

        await ctx.reply(
            this.localizationService.getT('complaint.form.confirmation', this.language)
                .replace('{botName}', BOT_NAME)
                .replace('{userInfo}', userInfo)
                .replace('{description}', form.description || ''), {

            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: this.localizationService.getT('complaint.form.confirmSubmission', this.language), callback_data: 'confirm_submission' }],
                    [{ text: this.localizationService.getT('complaint.form.restartForm', this.language), callback_data: 'restart_form' }]
                ]
            }
        });
    }

    @Hears(ScammerFrom.RESEND_TEXT)
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
            this.localizationService.getT('complaint.form.step3', this.language).replace('{count}', '0'), {
            reply_markup: {
                keyboard: [
                    ScammerFrom.KEYBOARDS.DONE,
                    ScammerFrom.KEYBOARDS.RESEND,
                    ScammerFrom.KEYBOARDS.CANCEL
                ],
                resize_keyboard: true
            }
        });

        form.lastInstructionMessageId = message.message_id;
    }

    @Hears(ScammerFrom.NO_USERNAME_TEXT)
    async onUsernameMissing(@Ctx() ctx: ScammerFormSession) {
        await ctx.reply(
            this.localizationService.getT('complaint.form.step1SelectUser', this.language), {
            reply_markup: {
                keyboard: [
                    ScammerFrom.KEYBOARDS.SELECT_USER,
                    ScammerFrom.KEYBOARDS.CANCEL
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
    }

    @Hears(ScammerFrom.SELECT_USER_TEXT)
    async onSelectScammer(@Ctx() ctx: ScammerFormSession) {
        return;
    }

    @On('callback_query')
    async onCallbackQuery(@Ctx() ctx: ScammerFormSession) {
        const callbackData = (ctx.callbackQuery as any)?.data;

        if (callbackData === 'back_to_username_step') {
            await ctx.answerCbQuery();
            await ctx.reply(
                this.localizationService.getT('complaint.form.step1SelectUser', this.language),
                {
                    reply_markup: {
                        keyboard: [
                            ScammerFrom.KEYBOARDS.SELECT_USER,
                            ScammerFrom.KEYBOARDS.CANCEL
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                }
            );
        } else if (callbackData === 'confirm_submission') {
            await ctx.answerCbQuery();

            const scamForm = await this.scamformService.create({
                scammerData: ctx.session.scamForm.scammerData,
                description: ctx.session.scamForm.description,
                media: ctx.session.scamForm.media,
                userTelegramId: String(ctx.from?.id)
            })

            await this.sendMessageToChannel(ctx, scamForm.id)

            await ctx.reply(this.localizationService.getT('complaint.form.success', this.language), {
                reply_markup: {
                    remove_keyboard: true
                }
            });

            await ctx.scene.leave();
        } else if (callbackData === 'restart_form') {
            await ctx.answerCbQuery();

            ctx.session.scamForm = {
                step: 1,
                scammerData: {},
                description: null,
                media: [],
                processedMediaGroups: new Set()
            };

            const message = await ctx.reply(
                this.localizationService.getT('complaint.form.step1', this.language), {
                reply_markup: {
                    keyboard: [
                        ScammerFrom.KEYBOARDS.NO_USERNAME,
                        ScammerFrom.KEYBOARDS.CANCEL,
                    ],
                    resize_keyboard: true
                }
            });

            ctx.session.scamForm.lastInstructionMessageId = message.message_id;
        }
    }

    @On('text')
    async onText(@Ctx() ctx: ScammerFormSession) {
        const form = ctx.session.scamForm;
        if (!form) return;

        const text: string = (ctx.message as any)?.text;
        if (form.step === 1) {
            const msg = ctx.message as any;
            const text = msg?.text;
            const forwardedMessage = msg?.forward_from;

            if (forwardedMessage) {
                form.scammerData.telegramId = forwardedMessage.id.toString();
                form.scammerData.username = forwardedMessage.username;
            } else if (text?.startsWith('@')) {
                form.scammerData.username = text.slice(1);
            } else if (/^\d+$/.test(text)) {
                form.scammerData.telegramId = text;
            } else {
                await ctx.reply(this.localizationService.getT('complaint.errors.invalidInput', this.language));
                return;
            }

            form.step = 2;
            await ctx.reply(
                this.localizationService.getT('complaint.form.step2', this.language),
                { reply_markup: { keyboard: [ScammerFrom.KEYBOARDS.CANCEL], resize_keyboard: true } }
            );
            return;
        }
        if (form.step === 2) {
            if (!text || text.length > 500) {
                await ctx.reply(this.localizationService.getT('complaint.errors.descriptionTooLong', this.language));
                return;
            }
            form.description = text;
            form.step = 3;

            const message = await ctx.reply(
                this.localizationService.getT('complaint.form.step3', this.language).replace('{count}', '0'), {
                reply_markup: {
                    keyboard: [
                        ScammerFrom.KEYBOARDS.DONE,
                        ScammerFrom.KEYBOARDS.RESEND,
                        ScammerFrom.KEYBOARDS.CANCEL
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

        if (form.step === 1) {
            const text = (ctx.message as any)?.text;
            const userSharedId = (ctx.message as any)?.user_shared?.user_id;

            if (userSharedId) {
                form.scammerData.telegramId = userSharedId.toString();
            } else {
                if (!text || (!text.startsWith('@') && !/^\d+$/.test(text))) {
                    await ctx.reply(this.localizationService.getT('complaint.errors.invalidUsernameOrId', this.language));
                    return;
                }

                if (text.startsWith('@')) {
                    form.scammerData.username = text.slice(1);
                } else {
                    form.scammerData.telegramId = text;
                }
            }

            form.step = 2;
            await ctx.reply(
                this.localizationService.getT('complaint.form.step2', this.language),
                { reply_markup: { keyboard: [ScammerFrom.KEYBOARDS.CANCEL], resize_keyboard: true } }
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

                if (mediaCount > 10) {
                    await ctx.reply(this.localizationService.getT('complaint.errors.tooManyMedia', this.language));
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
                        this.localizationService.getT('complaint.form.step3', this.language).replace('{count}', mediaCount.toString()), {
                        reply_markup: {
                            keyboard: [
                                ScammerFrom.KEYBOARDS.DONE,
                                ScammerFrom.KEYBOARDS.RESEND,
                                ScammerFrom.KEYBOARDS.CANCEL
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
                                this.localizationService.getT('complaint.form.step3', this.language).replace('{count}', form.media.length.toString()), {
                                reply_markup: {
                                    keyboard: [
                                        ScammerFrom.KEYBOARDS.DONE,
                                        ScammerFrom.KEYBOARDS.RESEND,
                                        ScammerFrom.KEYBOARDS.CANCEL
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

   

    private async sendMessageToChannel(ctx: ScammerFormSession, scamFormId: string) {
        const channelId = '@qyqly';
        const userInfo = ctx.from?.username ? `@${ctx.from.username}` : `ID: ${ctx.from?.id}`;

        const scammerInfo = this.telegramService.formatUserInfo(
            ctx.session.scamForm.scammerData.username,
            ctx.session.scamForm.scammerData.telegramId,
        );

        const channelMessage = this.localizationService.getT('complaint.form.channelMessage', "ru")
            .replace('{botName}', BOT_NAME)
            .replace('{scammerInfo}', scammerInfo)
            .replace('{description}', ctx.session.scamForm.description || '')
            .replace('{userInfo}', userInfo);

        const reply_markup = {
            inline_keyboard: [
                [
                    { text: '👍 0', callback_data: `like_complaint:${scamFormId}` },
                    { text: '👎 0', callback_data: `dislike_complaint:${scamFormId}` }
                ]
            ]
        };

        try {
            let replyToMessageId: number | undefined;

            const media = ctx.session.scamForm.media;

            if (media.length > 0) {
                const mediaGroup = media.slice(0, 10).map((m) => ({
                    type: m.type === 'photo' ? 'photo' : 'video',
                    media: m.file_id
                }));

                const messages = await this.telegramService.sendMediaGroupToChannel(channelId, mediaGroup);

                if (messages && messages.length > 0) {
                    replyToMessageId = messages[0].message_id;
                }
            }

            await this.telegramService.sendMessageToChannel(channelId, channelMessage, {
                parse_mode: 'Markdown',
                reply_markup,
                reply_to_message_id: replyToMessageId
            });
        } catch (error) {
            console.error('Error sending to channel:', error);
        }
    }





}
