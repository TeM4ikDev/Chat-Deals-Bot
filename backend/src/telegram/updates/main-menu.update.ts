import { UserCheckMiddleware } from '@/auth/strategies/telegram.strategy';
import { UsersService } from '@/users/users.service';
import { UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Action, Command, Ctx, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { SceneContext } from 'telegraf/typings/scenes';
import { FORM_LIMITS } from '../constants/form-limits.constants';
import { SCENES } from '../constants/telegram.constants';
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

        const handled = await this.telegramService.checkStartPayload(ctx)
        if (handled) return

        if (isNew) {
            ctx.reply(this.localizationService.getT('mainMenu.welcome', language))
        }

        await ctx.reply(
            this.localizationService.getT('mainMenu.description', language),
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📝 Заполнить информацию для сделок', callback_data: 'submit_fill_info' }]
                    ],
                },
            })
    }


    @Command('fill_info')
    async onSubmitAppeal(@Ctx() ctx: Context, @Language() language: string) {
        const user = await this.userService.findUserByTelegramId(String(ctx.from.id))


        console.log(user?.DealsInfo)
        let {info} = this.telegramService.formatUserInfo(user?.DealsInfo);

        await ctx.reply(info, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📝 Изменить/заполнить информацию', callback_data: 'fill_info_form' }]
                ]
            },
            link_preview_options:{
                is_disabled: true
            },
        });
    }

  

    @Action('submit_fill_info')
    async onSubmitAppealAction(@Ctx() ctx: Context, @Language() language: string) {
        await this.onSubmitAppeal(ctx, language)
        await ctx.answerCbQuery();

    }


    @Action('fill_info_form')
    async onFillInfoForm(@Ctx() ctx: SceneContext) {
        await ctx.scene.enter(SCENES.FILL_INFO)
        await ctx.answerCbQuery();

    }


}
