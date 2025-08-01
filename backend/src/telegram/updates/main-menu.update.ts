import { UserCheckMiddleware } from '@/auth/strategies/telegram.strategy';
import { ITelegramUser } from '@/types/types';
import { UsersService } from '@/users/users.service';
import { UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRoles } from '@prisma/client';
import { Action, Command, Ctx, Start, Update } from 'nestjs-telegraf';
import { Context, Scenes } from 'telegraf';
import { SceneContext } from 'telegraf/typings/scenes';
import { SCENES } from '../constants/telegram.constants';
import { Language } from '../decorators/language.decorator';
import { LocalizationService } from '../services/localization.service';
import { TelegramService } from '../telegram.service';
import { TelegramUpdate } from '../telegram.update';


@UseGuards(UserCheckMiddleware)
@Update()
export class MainMenuUpdate extends TelegramUpdate {
    constructor(
        protected readonly telegramService: TelegramService,
        protected readonly configService: ConfigService,
        protected readonly userService: UsersService,

        private readonly localizationService: LocalizationService,
    ) {
        super(telegramService, configService, userService);
    }

    @Start()
    async onStart(@Ctx() ctx: Context, @Language() language: string) {
        const { user, isNew } = await this.userService.findOrCreateUser(ctx.from);
        const showAdminButtons = (user.role == UserRoles.SUPER_ADMIN || user.role == UserRoles.ADMIN)


        const telegramUser: ITelegramUser = {
            id: ctx.from.id,
            first_name: ctx.from.first_name,
            last_name: ctx.from.last_name,
            username: ctx.from.username,
            language_code: ctx.from.language_code,
            is_premium: ctx.from.is_premium
        };


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
                        [
                            { text: this.localizationService.getT('mainMenu.buttons.catalog', language), url: 'https://t.me/nftcatalog' },
                            { text: this.localizationService.getT('mainMenu.buttons.tags', language), url: 'https://t.me/svdteg' },
                        ],
                        [
                            { text: this.localizationService.getT('mainMenu.buttons.addToGroup', language), url: 'https://t.me/svdbasebot?startgroup=true' },
                            { text: this.localizationService.getT('mainMenu.buttons.allProjects', language), url: 'https://t.me/giftthread' }
                        ],
                        ...(
                            showAdminButtons
                                ? [[{ text: 'Запустить приложение', url: `https://rnxsk3jf-8080.euw.devtunnels.ms/?data=${encodeURIComponent(JSON.stringify(telegramUser))}` }]]
                                : []
                        )
                    ],
                },
            });
    }

    @Command('report')
    async reportUser(@Ctx() ctx: SceneContext, @Language() language: string) {
        await this.onSubmitComplaint(ctx, language)
    }


    @Action('submit_complaint')
    async onSubmitComplaint(@Ctx() ctx: Context, @Language() language: string) {
        if ('callback_query' in ctx && ctx.callbackQuery?.id) {
            await ctx.answerCbQuery();
        }

        await ctx.reply(
            this.localizationService.getT('complaint.fullInstructions', language),
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '📁 Заполнить форму', callback_data: 'fill_form' }
                        ],
                    ]
                }
            }
        );
    }

    @Action('fill_form')
    fillForm(@Ctx() ctx: Scenes.SceneContext) {
        ctx.scene.enter(SCENES.SCAMMER_FORM)
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

        this.onStart(ctx, language)
    }





  

}
