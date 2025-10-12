import { ScamformService } from "@/scamform/scamform.service";
import { LocalizationService } from "@/telegram/services/localization.service";
import { TelegramService } from "@/telegram/telegram.service";
import { IScammerData } from "@/types/types";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Action, Ctx, Hears, On, Scene, SceneEnter, SceneLeave } from "nestjs-telegraf";
import { Scenes } from "telegraf";
import { BOT_NAME, SCENES } from "../constants/telegram.constants";
import { Language } from "../decorators/language.decorator";
import { TelegramClient } from "../updates/TelegramClient";


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
    private static readonly SKIP_TWINS_TEXT = '⏭️ Пропустить твинки — Skip twins';

    private static readonly USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;

    private language: string = 'ru'
    private min_media = 1
    private max_media = 10

    private static readonly KEYBOARDS = {
        NO_USERNAME: [{ text: ScammerFrom.NO_USERNAME_TEXT }],
        CANCEL: [{ text: ScammerFrom.CANCEL_TEXT }],
        SELECT_USER: [{
            text: ScammerFrom.SELECT_USER_TEXT,
            request_user: {
                request_id: 1,
                user_is_bot: false,

            }
        } as any],
        DONE: [{ text: ScammerFrom.DONE_TEXT }],
        RESEND: [{ text: ScammerFrom.RESEND_TEXT }],
        // ADD_TWIN: [{ text: ScammerFrom.ADD_TWIN_TEXT }],
        SKIP_TWINS: [{ text: ScammerFrom.SKIP_TWINS_TEXT }]
    };

    constructor(
        private readonly scamformService: ScamformService,
        private readonly telegramService: TelegramService,
        private readonly localizationService: LocalizationService,
        private readonly configService: ConfigService,
        private readonly telegramClient: TelegramClient,
    ) { }

    @SceneEnter()
    async onSceneEnter(@Ctx() ctx: ScammerFormSession, @Language() scene_lang: string) {
        this.language = scene_lang

        ctx.session.scamForm = {
            step: 1,
            scammerData: {
                twinAccounts: [],
                collectionUsernames: [],
            },
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
        if (!form || form.step !== 4) return;

        if (form.media.length < this.min_media) {
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

        const mediaGroup = form.media.slice(0, this.max_media).map((media, index) => ({
            type: media.type as 'photo' | 'video',
            media: media.file_id
        }));

        if (mediaGroup.length > 0) {
            await ctx.replyWithMediaGroup(mediaGroup);
        }

        const userInfo = this.telegramService.formatUserInfo(form.scammerData, this.language);

        await ctx.reply(
            this.localizationService.getT('complaint.form.confirmation', this.language)
                .replace('{botName}', BOT_NAME)
                .replace('{userInfo}', userInfo)
                .replace('{twinAccounts}', this.telegramService.formatTwinAccounts(form.scammerData.twinAccounts))
                .replace('{description}', this.telegramService.escapeMarkdown(form.description) || ''), {

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
        if (!form || form.step !== 4) return;

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
            this.localizationService.getT('complaint.form.step4', this.language).replace('{count}', '0'), {
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

    // @Hears(ScammerFrom.ADD_TWIN_TEXT)
    // async onAddTwin(@Ctx() ctx: ScammerFormSession) {
    //     const form = ctx.session.scamForm;
    //     if (!form || form.step !== 2) return;

    //     await ctx.reply(
    //         'Отправьте username или Telegram ID твинка (можно несколько через пробел):\n\nПримеры:\n• @username 1234567890\n• @username\n• 1234567890\n\nИли перешлите сообщение от твинка',
    //         { reply_markup: { keyboard: [ScammerFrom.KEYBOARDS.CANCEL], resize_keyboard: true } }
    //     );
    // }

    @Hears(ScammerFrom.SKIP_TWINS_TEXT)
    async onSkipTwins(@Ctx() ctx: ScammerFormSession) {
        const form = ctx.session.scamForm;
        if (!form || form.step !== 2) return;

        form.step = 3;
        await ctx.reply(
            this.localizationService.getT('complaint.form.step3', this.language),
            { reply_markup: { keyboard: [ScammerFrom.KEYBOARDS.CANCEL], resize_keyboard: true } }
        );
    }


    // _______Actions__________

    @Action('back_to_username_step')
    async backToUsernameStep(@Ctx() ctx: ScammerFormSession) {
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
    }

    @Action('restart_form')
    async restartForm(@Ctx() ctx: ScammerFormSession) {
        await ctx.answerCbQuery();

        ctx.session.scamForm = {
            step: 1,
            scammerData: {
                twinAccounts: []
            },
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
                resize_keyboard: true,
            }
        });

        ctx.session.scamForm.lastInstructionMessageId = message.message_id;
    }

    @Action('confirm_submission')
    async confirmSubmission(@Ctx() ctx: ScammerFormSession) {
        await ctx.answerCbQuery();

        const scamForm = await this.scamformService.create({
            scammerData: ctx.session.scamForm.scammerData,
            description: ctx.session.scamForm.description,
            media: ctx.session.scamForm.media,
            userTelegramId: String(ctx.from?.id)
        })

        await this.telegramService.sendScamFormMessageToChannel({
            fromUser: {
                username: ctx.from?.username,
                telegramId: String(ctx.from?.id)
            },
            scammerData: ctx.session.scamForm.scammerData,
            media: ctx.session.scamForm.media,
            scamForm
        })

        await ctx.reply(this.localizationService.getT('complaint.form.success', this.language).replace('{complaintId}', scamForm.id), {
            reply_markup: {
                remove_keyboard: true,
            },
            parse_mode: 'Markdown',
        });

        await ctx.scene.leave();
    }

    // ____________________________

    @On('text')
    async onText(@Ctx() ctx: ScammerFormSession) {
        const form = ctx.session.scamForm;
        if (!form) return;
        const text: string = (ctx.message as any)?.text;

        if (form.step === 1) {
            const msg = ctx.message as any;
            const text = msg?.text;
            const forwardedMessage = msg?.forward_from;

            console.log('forwardedMessage', forwardedMessage)
            if (forwardedMessage) {
                form.scammerData.telegramId = forwardedMessage.id.toString();
                form.scammerData.username = forwardedMessage.username;
            }
            else if (text) {
                const part = text.split(' ')[0].trim()
                let hasValidInput = false;

                if (part.startsWith('@')) {
                    const username = part.replace('@', '')

                    if (!ScammerFrom.USERNAME_REGEX.test(username)) return

                    const info = await this.telegramClient.getUserData(username);

                    if (!info) {
                        ctx.reply("Такого юзернейма не существует. Возможно это канал или группа. Попробуйте ввести другой юзернейм.");
                        return
                    }
                    else {
                        form.scammerData.username = username;
                        form.scammerData.telegramId = info?.id;
                        form.scammerData.collectionUsernames = info?.collectionUsernames;
                        hasValidInput = true;
                    }
                }
                else if (/^\d+$/.test(part)) {
                    form.scammerData.telegramId = part;
                    hasValidInput = true;
                }

                if (!hasValidInput) {
                    await ctx.reply(this.localizationService.getT('complaint.errors.invalidInput', this.language));
                    return;
                }
            }
            else {
                await ctx.reply(this.localizationService.getT('complaint.errors.invalidInput', this.language));
                return;
            }

            const existingScammer = await this.scamformService.getScammerByQuery(form.scammerData.username || form.scammerData.telegramId);
            if (existingScammer) {
                const { textInfo } = this.telegramService.formatScammerData(existingScammer, false);
                await ctx.reply(`Существующий пользователь.\n\n${textInfo}`, {
                    parse_mode: 'Markdown',
                    link_preview_options: {
                        is_disabled: true,
                    },
                })
            }

            form.step = 2;
            await ctx.reply(
                this.localizationService.getT('complaint.form.step2', this.language)
                    .replace('{userInfo}', this.telegramService.formatUserInfo(form.scammerData, this.language, false)),
                {
                    reply_markup: {
                        keyboard: [
                            // ScammerFrom.KEYBOARDS.ADD_TWIN,
                            ScammerFrom.KEYBOARDS.SKIP_TWINS,
                            ScammerFrom.KEYBOARDS.CANCEL
                        ],
                        resize_keyboard: true
                    }
                }
            );
            return;
        }

        if (form.step === 2) {
            // Обработка твинков
            const msg = ctx.message as any;
            const text = msg?.text;
            const forwardedMessage = msg?.forward_from;



            if (forwardedMessage) {
                form.scammerData.twinAccounts.push({
                    telegramId: forwardedMessage.id.toString(),
                    username: forwardedMessage.username
                });
            }
            else if (text) {
                console.log(text.split(/\n/))

                const lines = text.split(/\n/);

                for (const line of lines) {

                    const parts = line.trim().split(/\s+/).slice(0, 2);
                    let hasValidInput = false;
                    const newTwin: IScammerData = {};

                    for (const part of parts) {
                        if (part.startsWith('@')) {
                            const username = part.slice(1);
                            if (ScammerFrom.USERNAME_REGEX.test(username)) {
                                newTwin.username = username;
                                hasValidInput = true;
                            }
                        }
                        else if (/^\d+$/.test(part)) {
                            newTwin.telegramId = part;
                            hasValidInput = true;
                        }
                    }


                    if (hasValidInput) {
                        form.scammerData.twinAccounts.push(newTwin);
                    } else {
                        await ctx.reply(this.localizationService.getT('complaint.errors.invalidInput', this.language));
                        return;
                    }
                }
            }
            else {
                await ctx.reply(this.localizationService.getT('complaint.errors.invalidInput', this.language));
                return;
            }


            const twinsList = form.scammerData.twinAccounts.length > 0
                ? form.scammerData.twinAccounts.map((twin, index) =>
                    `${index + 1}. ${twin.username ? '@' + twin.username : ''} ${twin.telegramId ? `(${twin.telegramId})` : ''}`
                ).join('\n')
                : 'Пока нет твинков';

            await ctx.reply(
                this.localizationService.getT('complaint.form.addedTwin', this.language).replace('{twinsList}', twinsList),
                {
                    reply_markup: {
                        keyboard: [
                            ScammerFrom.KEYBOARDS.SKIP_TWINS,
                            ScammerFrom.KEYBOARDS.CANCEL
                        ],
                        resize_keyboard: true
                    }
                }
            );
            return;
        }

        if (form.step === 3) {
            if (!text || text.length > 500) {
                await ctx.reply(this.localizationService.getT('complaint.errors.descriptionTooLong', this.language));
                return;
            }
            form.description = text;
            form.step = 4;

            const message = await ctx.reply(
                this.localizationService.getT('complaint.form.step4', this.language).replace('{count}', '0'), {
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

            console.log((ctx.message as any)?.user_shared)

            const info = await this.telegramClient.getUserData(userSharedId.toString());
            console.log(info)

            if (userSharedId) {
                form.scammerData.telegramId = userSharedId.toString();
                form.scammerData.username = info?.username;
                form.scammerData.collectionUsernames = info?.collectionUsernames;
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
                this.localizationService.getT('complaint.form.step2', this.language)
                    .replace('{userInfo}', this.telegramService.formatUserInfo(form.scammerData, this.language, false)),
                {
                    reply_markup: {
                        keyboard: [
                            // ScammerFrom.KEYBOARDS.ADD_TWIN,
                            ScammerFrom.KEYBOARDS.SKIP_TWINS,
                            ScammerFrom.KEYBOARDS.CANCEL
                        ],
                        resize_keyboard: true
                    }
                }
            );
            return;
        }

        if (form.step === 4) {
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
                        this.localizationService.getT('complaint.form.step4', this.language).replace('{count}', mediaCount.toString()), {
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
                        if (form.step === 4) {
                            if (form.lastInstructionMessageId) {
                                try {
                                    await ctx.deleteMessage(form.lastInstructionMessageId);
                                } catch (error) {
                                    console.log('Не удалось удалить предыдущее сообщение:', error);
                                }
                            }

                            const message = await ctx.reply(
                                this.localizationService.getT('complaint.form.step4', this.language).replace('{count}', form.media.length.toString()), {
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






}
