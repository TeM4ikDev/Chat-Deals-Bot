import { UserCheckMiddleware } from '@/auth/strategies/telegram.strategy';
import { UsersService } from '@/users/users.service';
import { UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Action, Command, Ctx, Start, Update } from 'nestjs-telegraf';
import { Context, Scenes } from 'telegraf';
import { BOT_NAME, SCENES } from '../constants/telegram.constants';
import { Language } from '../decorators/language.decorator';
import { LocalizationService } from '../services/localization.service';
import { TelegramService } from '../telegram.service';


@UseGuards(UserCheckMiddleware)
@Update()
export class MainMenuUpdate {
    constructor(
        protected readonly telegramService: TelegramService,
        protected readonly configService: ConfigService,
        protected readonly userService: UsersService,
        private readonly localizationService: LocalizationService,
    ) { }

    @Start()
    async onStart(@Ctx() ctx: Context, @Language() language: string) {
        const { user, isNew } = await this.userService.findOrCreateUser(ctx.from);

        if (isNew) {
            ctx.reply(this.localizationService.getT('mainMenu.welcome', language))
        }

        await ctx.reply(
            this.localizationService.getT('mainMenu.description', language),
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: this.localizationService.getT('mainMenu.buttons.changeLang', language), callback_data: 'change_lang' }],
                        [{ text: this.localizationService.getT('mainMenu.buttons.submitComplaint', language), callback_data: 'submit_complaint' }],
                        [{ text: this.localizationService.getT('mainMenu.buttons.submitAppeal', language), callback_data: 'submit_appeal' }],

                        [
                            { text: this.localizationService.getT('mainMenu.buttons.catalog', language), url: 'https://t.me/nftcatalog' },
                            { text: this.localizationService.getT('mainMenu.buttons.tags', language), url: 'https://t.me/svdteg' },
                        ],
                        [
                            { text: this.localizationService.getT('mainMenu.buttons.addToGroup', language), url: 'https://t.me/svdbasebot?startgroup=true' },
                            { text: this.localizationService.getT('mainMenu.buttons.allProjects', language), url: 'https://t.me/giftthread' }
                        ],

                        [{ text: this.localizationService.getT('mainMenu.buttons.launchApp', language), url: `https://t.me/${BOT_NAME}?startapp` }]
                    ],
                },
            });

        // if ('callback_query' in ctx && ctx.callbackQuery?.id) {
        //     await ctx.answerCbQuery();
        // }


    }

    @Command('report')
    async reportUser(@Ctx() ctx: Context, @Language() language: string) {

        await ctx.reply(
            this.localizationService.getT('complaint.fullInstructions', language), {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: this.localizationService.getT('mainMenu.buttons.fillform', language), callback_data: 'fill_scammer_form' }
                    ],
                ]
            }
        }
        );
    }

    @Command('appeal')
    async onSubmitAppeal(@Ctx() ctx: Context, @Language() language: string) {
        await ctx.reply(this.localizationService.getT('appeal.fullInstructions', language), {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: this.localizationService.getT('mainMenu.buttons.fillform', language), callback_data: 'fill_appeal_form' }]
                ]
            }
        });
    }

    @Action('submit_complaint')
    async onSubmitComplaint(@Ctx() ctx: Context, @Language() language: string) {
        await this.reportUser(ctx, language)
        await ctx.answerCbQuery();

    }

    @Action('submit_appeal')
    async onSubmitAppealAction(@Ctx() ctx: Context, @Language() language: string) {
        await this.onSubmitAppeal(ctx, language)
        await ctx.answerCbQuery();

    }

    @Action('fill_scammer_form')
    async fillScammerForm(@Ctx() ctx: Scenes.SceneContext) {
        ctx.scene.enter(SCENES.SCAMMER_FORM)
        await ctx.answerCbQuery();

    }

    @Action('fill_appeal_form')
    async fillAppealForm(@Ctx() ctx: Scenes.SceneContext) {
        ctx.scene.enter(SCENES.APPEAL_FORM)
        await ctx.answerCbQuery();
    }

    @Action('select_user')
    async onSelectUser(@Ctx() ctx: Context, @Language() language: string) {
        if ('callback_query' in ctx && ctx.callbackQuery?.id) {
            await ctx.answerCbQuery();
        }

        await ctx.reply(this.localizationService.getT('complaint.selectUser', language), {
            reply_markup: {
                inline_keyboard: [
                    [{ text: this.localizationService.getT('mainMenu.buttons.back', language), callback_data: 'back_to_main' }]
                ]
            }
        });
    }

    @Action('back_to_main')
    async onBackToMain(@Ctx() ctx: Context, @Language() language: string) {
        if ('callback_query' in ctx && ctx.callbackQuery?.id) {
            await ctx.answerCbQuery();
        }

        if ('callback_query' in ctx && ctx.callbackQuery?.message?.message_id) {
            try {
                await ctx.telegram.deleteMessage(ctx.chat.id, ctx.callbackQuery.message.message_id);
            } catch (e) { }
        }

        await this.onStart(ctx, language)
    }
}
