import { TelegramService } from "@/telegram/telegram.service";
import { UsersService } from "@/users/users.service";
import { Ctx, InjectBot, InlineQuery, Update } from "nestjs-telegraf";
import { Context, Telegraf } from "telegraf";
import { InlineKeyboardButton, InlineQueryResult } from "telegraf/typings/core/types/typegram";




@Update()
export class InlineQueryUpdate {
    constructor(
        private readonly telegramService: TelegramService,
        private readonly usersService: UsersService,
        @InjectBot() private readonly bot: Telegraf,
    ) { }

    @InlineQuery(/.*/)
    async onInlineQuery(@Ctx() ctx: Context) {
        // const ctxt = ctx
        // console.log((ctxt as any).scene.ctx)

        await this.handleInlineQuery(ctx);
    }

    private async handleInlineQuery(ctx: Context) {
        const query = ctx.inlineQuery.query.trim()
        let results: InlineQueryResult[] = []

        const user = await this.usersService.findUserByTelegramId(String(ctx.from.id))


        if (!user?.DealsInfo) {
            await ctx.answerInlineQuery([])
            return
        }
        const { addressesText } = this.telegramService.formatUserInfo(user.DealsInfo)

        console.log(/^\d+(\.\d+)?$/.test(query))
        if (!query) {
            const inline_keyboard = JSON.parse(user.DealsInfo.KeyboardUrls as string)

            console.log(inline_keyboard)

            results = [
                {
                    type: 'article',
                    id: 'garants',
                    title: 'Отправить адрес',
                    input_message_content: {
                        message_text: addressesText,
                        parse_mode: 'HTML',
                        link_preview_options: { is_disabled: true },
                    },
                    // reply_markup: {
                    //     inline_keyboard: [
                    //         [{ text: '📝 Сайт', url: 'https://cursor.com/' }],
                    //     ],
                    // },
                    description: 'Отправить адрес',
                },
                {
                    type: 'article',
                    id: 'instruction',
                    // thumbnail_url: INLINE_QUERY_PATHS.USERNAME_SEARCH,
                    title: 'Завершить сделку',
                    input_message_content: {
                        message_text: `Сделка прошла успешно❤️\n#сделказавершена\n\nБуду благодарен отзыву со скрином и моим юзером <code>(@${user.username})</code> в мой чат`,
                        parse_mode: 'HTML',
                    },
                    reply_markup: {
                        inline_keyboard: [inline_keyboard as any]
                    },
                    description: 'Завершить сделку',
                },
            ];
        }

        else if (/^\d+(\.\d+)?$/.test(query)) {
            results = [
                {
                    type: 'article',
                    id: 'zero',
                    title: 'Отправить адрес +0%',
                    input_message_content: {
                        message_text: `Сумма <code>${query}</code> TON\n\n${addressesText}`,
                        parse_mode: 'HTML',
                        link_preview_options: { is_disabled: true },
                    },
                    description: 'Отправить адрес и сумму +0%',
                },

                {
                    type: 'article',
                    id: 'two',
                    title: 'Отправить адрес +2%',
                    input_message_content: {
                        message_text: `Сумма <code>${(Number(query) * 1.02).toFixed(2)}</code> TON\n\n${addressesText}`,
                        parse_mode: 'HTML',
                        link_preview_options: { is_disabled: true },
                    },
                    // reply_markup: {
                    //     inline_keyboard: [
                    //         [{ text: '📝 Сайт', url: 'https://cursor.com/' }],
                    //     ],
                    // },
                    description: 'Отправить адрес и сумму +0%',
                },



            ]
        }


        await ctx.answerInlineQuery(results);
    }
}