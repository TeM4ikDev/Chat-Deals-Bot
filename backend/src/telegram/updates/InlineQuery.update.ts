import { ScamformService } from "@/scamform/scamform.service";
import { TelegramService } from "@/telegram/telegram.service";
import { UsersService } from "@/users/users.service";
import { Ctx, InjectBot, InlineQuery, Update } from "nestjs-telegraf";
import { Context, Telegraf } from "telegraf";
import { InlineQueryResult } from "telegraf/typings/core/types/typegram";

@Update()

export class InlineQueryUpdate {

    constructor(
        private readonly telegramService: TelegramService,
        private readonly usersService: UsersService,
        private readonly scamformService: ScamformService,
        @InjectBot() private readonly bot: Telegraf,
    ) { }


    @InlineQuery(/.*/)
    async onInlineQuery(@Ctx() ctx: Context) {
        console.log(ctx)
        await this.handleInlineQuery(ctx);
    }

    private async handleInlineQuery(ctx: Context) {
        const query = ctx.inlineQuery.query.trim().replace(/^@/, '');

        if (!query) {
            const results: InlineQueryResult[] = [
                {
                    type: 'article',
                    id: 'instruction',
                    title: 'Введите @username для поиска',
                    input_message_content: {
                        message_text: '🔍 Введите @username для поиска в базе',
                    },
                    description: 'Начните вводить username',
                },
            ];
            await ctx.answerInlineQuery(results);
            return;
        }

        console.log('Inline query:', query);

        console.log(this.telegramService.checkIsGarant(query))

        if (await this.telegramService.checkIsGarant(query)) {
            const results: InlineQueryResult[] = [
                {
                    type: 'article',
                    id: 'garant_found',
                    title: '✅ Проверенный гарант найден',
                    input_message_content: {
                        message_text: `✅ **Проверенный гарант!**\n\n👤 **Пользователь:** @${this.telegramService.escapeMarkdown(query)}\n\n💎 Этот пользователь является проверенным гарантом проекта.\n\n✅ Рекомендуем проводить сделки через этого гаранта.`,
                        parse_mode: 'Markdown',
                        link_preview_options: {
                            is_disabled: true,
                        },
                    },
                    description: 'Пользователь найден в базе гарантов',
                },
            ];
            await ctx.answerInlineQuery(results);
            return;
        }

        const scammer = await this.scamformService.getScammerByQuery(query);

        const results: InlineQueryResult[] = [];
        if (!scammer) {
            results.push({
                type: 'article',
                id: 'not_found',
                title: 'Пользователь не найден',
                input_message_content: {
                    message_text: `🔍 Пользователь не найден в базе.\n\n⚠️ Помните: даже если пользователь отсутствует в базе, это **не гарантирует** его надежность.\n\n✅ Рекомендуем проводить сделки только через проверенного гаранта.`,
                    parse_mode: 'Markdown', 
                    link_preview_options: {
                        is_disabled: true,
                    },
                },
                description: 'Пользователь не найден в базе',
            });
        } else {
            const username = scammer.username ? `@${(scammer.username)}` : 'Без username';
            const telegramId = scammer.telegramId || '--';
            const formsCount = scammer.scamForms.length;
            const status = this.telegramService.getScammerStatusText(scammer);
            const description = this.telegramService.escapeMarkdown(scammer.description || 'нет описания');
            const twinAccounts = this.telegramService.formatTwinAccounts(scammer.twinAccounts);

            results.push({
                type: 'article',
                id: 'scammer_found',
                title: `${status} найден`,
                input_message_content: {
                    message_text: `*${username}*\n\nID: \`${telegramId}\`\nСтатус: *${scammer.status}*\nЖалоб: *${formsCount}*\nОписание: ${this.telegramService.escapeMarkdown(description)}\n\nТвинки:\n${twinAccounts}\n\n[🔍 Посмотреть в приложении](https://t.me/svdbasebot/scamforms?startapp=${scammer.username || scammer.telegramId})`,
                    parse_mode: 'Markdown',
                    link_preview_options: {
                        is_disabled: true,
                    },
                },
                description: `${status} • ${formsCount} жалоб`,
            });
        }

        await ctx.answerInlineQuery(results);
    }
}