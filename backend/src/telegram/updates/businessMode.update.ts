import { UserCheckMiddleware } from '@/auth/strategies/telegram.strategy';
import { UsersService } from '@/users/users.service';
import { UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Action, Command, Ctx, On, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Language } from '../decorators/language.decorator';
import { LocalizationService } from '../services/localization.service';
import { TelegramService } from '../telegram.service';

// @UseGuards(UserCheckMiddleware)
@Update()
export class BusinessModeUpdate {
    constructor(
        protected readonly telegramService: TelegramService,
        protected readonly configService: ConfigService,
        protected readonly userService: UsersService,
        private readonly localizationService: LocalizationService,
    ) { }

    @On('business_message' as any)
    async onBusinessMessage(@Ctx() ctx: Context) {
        const msg = (ctx.update as any).business_message;

        // console.log(ctx)

        const from = msg.from;
        const chat = msg.chat;

        // console.log(chat)

        if(msg.text != 'инфо') return

        const info = `
👤 Собеседник:
ID: ${chat.id}
Имя: ${chat.first_name || ''}
Фамилия: ${chat.last_name || ''}
Username: @${chat.username || 'нет'}

💬 Сообщение: ${msg.text}
    `;

        // console.log(info);

        await ctx.telegram.callApi('sendMessage', {
            business_connection_id: msg.business_connection_id,
            chat_id: msg.chat.id,
            text: info,
          } as any) ;
    }
}



