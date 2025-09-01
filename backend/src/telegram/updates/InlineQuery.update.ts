import { TelegramService } from "@/telegram/telegram.service";
import { Context } from "telegraf";
import { Ctx, On } from "nestjs-telegraf";

export class InlineQueryUpdate {
    
    constructor(
        private readonly telegramService: TelegramService,
    ) { }

    @On('inline_query')
    async onInlineQuery(@Ctx() ctx: Context) {
        console.log(ctx)
    }
}