import { UserCheckMiddleware } from '@/auth/strategies/telegram.strategy';
import { ITelegramUser } from '@/types/types';
import { UsersService } from '@/users/users.service';
import { UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRoles } from '@prisma/client';
import { Action, Ctx, Start, Update } from 'nestjs-telegraf';
import { Context, Scenes } from 'telegraf';
import { Language } from '../decorators/language.decorator';
import { LocalizationService } from '../services/localization.service';
import { TelegramService } from '../telegram.service';
import { TelegramUpdate } from '../telegram.update';
import { SCENES } from '../constants/telegram.constants';


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




    @Action('submit_complaint')
    async onSubmitComplaint(@Ctx() ctx: Context, @Language() language: string) {
        if ('callback_query' in ctx && ctx.callbackQuery?.id) {
            await ctx.answerCbQuery();
        }

        await ctx.editMessageText(
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
    fillForm(@Ctx() ctx: Scenes.SceneContext){
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


    // ______________________

    // @Command('find')
    // async onFindUser(@Ctx() ctx: Context, @Language() language: string) {
    //     const user = await this.userService.findUserByTelegramId(String(ctx.from.id));

    //     console.log(user.role)


    //     if (!user || user.role !== UserRoles.SUPER_ADMIN) {
    //         await ctx.reply(this.localizationService.getT('admin.accessDenied', language));
    //         return;
    //     }


    //     if (user && ctx.from.username && user.username !== ctx.from.username) {
    //         await this.userService.updateUsernameByTelegramId(String(ctx.from.id), ctx.from.username);
    //     }


    //     const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    //     const parts = text.split(' ');
    //     const query = parts[1];
    //     if (!query) {
    //         await ctx.reply(this.localizationService.getT('admin.findCommand', language));
    //         return;
    //     }
    //     let targetUser = null;
    //     if (/^\d+$/.test(query)) {
    //         targetUser = await this.userService.findUserByTelegramId(query);
    //     } else {
    //         // username без @
    //         targetUser = await this.userService.findUserByUsername(query.replace(/^@/, ''));
    //     }
    //     if (!targetUser) {
    //         await ctx.reply('Пользователь не найден.');
    //         return;
    //     }
    //     let info = `Пользователь: @${targetUser.username || '-'}\nID: ${targetUser.telegramId}\nРоль: ${targetUser.role}`;
    //     let adminButton = [];
    //     if (targetUser.role !== UserRoles.SUPER_ADMIN) {
    //         adminButton = targetUser.role === UserRoles.ADMIN
    //             ? [{ text: 'Снять админку', callback_data: `remove_admin:${targetUser.telegramId}` }]
    //             : [{ text: 'Выдать админку', callback_data: `give_admin:${targetUser.telegramId}` }];
    //     }
    //     await ctx.reply(info, {
    //         reply_markup: adminButton.length ? { inline_keyboard: [adminButton] } : undefined
    //     });
    // }

    // @Action(/give_admin:(.+)/)
    // async onGiveAdmin(@Ctx() ctx: Context) {
    //     const user = await this.userService.findUserByTelegramId(String(ctx.from.id));
    //     if (!user || user.role !== UserRoles.SUPER_ADMIN) {
    //         await ctx.reply('⛔️ Доступ запрещён. Только для супер-админа.');
    //         return;
    //     }
    //     const cbq = ctx.callbackQuery;
    //     let data: string | undefined = undefined;
    //     if (cbq && 'data' in cbq && typeof cbq.data === 'string') {
    //         data = cbq.data;
    //     }
    //     const match = data?.match(/^give_admin:(\d+)$/);
    //     const targetTelegramId = match ? match[1] : null;
    //     if (!targetTelegramId) {
    //         await ctx.reply('Не удалось определить пользователя.');
    //         return;
    //     }
    //     const updatedUser = await this.userService.setAdminRole(targetTelegramId);
    //     await ctx.reply(`Пользователь @${updatedUser.username || '-'} теперь админ.`);
    // }

    // @Action(/remove_admin:(.+)/)
    // async onRemoveAdmin(@Ctx() ctx: Context) {
    //     const user = await this.userService.findUserByTelegramId(String(ctx.from.id));
    //     if (!user || user.role !== UserRoles.SUPER_ADMIN) {
    //         await ctx.reply('⛔️ Доступ запрещён. Только для супер-админа.');
    //         return;
    //     }
    //     const cbq = ctx.callbackQuery;
    //     let data: string | undefined = undefined;
    //     if (cbq && 'data' in cbq && typeof cbq.data === 'string') {
    //         data = cbq.data;
    //     }
    //     const match = data?.match(/^remove_admin:(\d+)$/);
    //     const targetTelegramId = match ? match[1] : null;
    //     if (!targetTelegramId) {
    //         await ctx.reply('Не удалось определить пользователя.');
    //         return;
    //     }
    //     const updatedUser = await this.userService.removeAdminRole(targetTelegramId);
    //     await ctx.reply(`Пользователь @${updatedUser.username || '-'} теперь обычный пользователь.`);
    // }

    // private escapeMarkdownV2(text: string): string {
    //     return text
    //         .replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
    // }
}
