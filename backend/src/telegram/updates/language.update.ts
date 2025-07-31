import { UserCheckMiddleware } from '@/auth/strategies/telegram.strategy';
import { UsersService } from '@/users/users.service';
import { UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserLanguage } from '@prisma/client';
import { Action, Ctx, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Language } from '../decorators/language.decorator';
import { LocalizationService } from '../services/localization.service';
import { TelegramService } from '../telegram.service';
import { TelegramUpdate } from '../telegram.update';
import { MainMenuUpdate } from './main-menu.update';

@UseGuards(UserCheckMiddleware)
@Update()
export class LanguageUpdate extends TelegramUpdate {
    constructor(
        protected readonly telegramService: TelegramService,
        protected readonly configService: ConfigService,
        protected readonly userService: UsersService,
        private readonly mainMenuUpdate: MainMenuUpdate,
        private readonly localizationService: LocalizationService,
    ) {
        super(telegramService, configService, userService);
    }

    @Action('change_lang')
    async onChangeLang(@Ctx() ctx: Context, @Language() language: string) {
        await ctx.reply(this.localizationService.getT('language.select', language), {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: this.localizationService.getT('language.buttons.ru', language), callback_data: 'set_lang_ru' },
                        { text: this.localizationService.getT('language.buttons.en', language), callback_data: 'set_lang_en' }
                    ],
                    [{ text: this.localizationService.getT('language.buttons.back', language), callback_data: 'back_to_main' }],
                ],
            },
        });
    }

    @Action('set_lang_ru')
    async onSetLanguageRu(@Ctx() ctx: Context) {
        console.log('Setting RU language');

        await this.userService.setUserLanguage(String(ctx.from.id), UserLanguage.RU);
        await ctx.answerCbQuery(this.localizationService.getT('language.changed.ru', 'ru'));
        await ctx.deleteMessage();
        await this.mainMenuUpdate.onStart(ctx, 'ru');
    }

    @Action('set_lang_en')
    async onSetLanguageEn(@Ctx() ctx: Context) {
        console.log('Setting EN language');

        await this.userService.setUserLanguage(String(ctx.from.id), UserLanguage.EN);
        await ctx.answerCbQuery(this.localizationService.getT('language.changed.en', 'en'));
        await ctx.deleteMessage();
        await this.mainMenuUpdate.onStart(ctx, 'en');
    }
}
