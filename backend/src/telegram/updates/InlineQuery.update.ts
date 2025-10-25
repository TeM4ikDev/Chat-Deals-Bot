import { ScamformService } from "@/scamform/scamform.service";
import { TelegramService } from "@/telegram/telegram.service";
import { UsersService } from "@/users/users.service";
import { Ctx, InjectBot, InlineQuery, Update } from "nestjs-telegraf";
import { Context, Telegraf } from "telegraf";
import { InlineQueryResult } from "telegraf/typings/core/types/typegram";
import { GarantsUpdate } from "./garants.update";
import { INLINE_QUERY_PATHS } from "../constants/telegram.constants";




@Update()
export class InlineQueryUpdate {
    constructor(
        private readonly telegramService: TelegramService,
        private readonly usersService: UsersService,
        private readonly garantsUpdateService: GarantsUpdate,
        private readonly scamformService: ScamformService,
        @InjectBot() private readonly bot: Telegraf,
    ) { }

    @InlineQuery(/.*/)
    async onInlineQuery(@Ctx() ctx: Context) {
        await this.handleInlineQuery(ctx);
    }

    private async handleInlineQuery(ctx: Context) {
        const query = ctx.inlineQuery.query.trim().replace(/^@/, '');

        if (!query) {
            const results: InlineQueryResult[] = [
                {
                    type: 'article',
                    id: 'garants',
                    thumbnail_url: INLINE_QUERY_PATHS.GARANTS,
                    title: 'Проверенные исполнители',
                    input_message_content: {
                        message_text: await this.garantsUpdateService.showGarants(ctx, 'ru', true),
                        parse_mode: 'Markdown',
                        link_preview_options: {
                            is_disabled: true,
                        },
                    },
                    description: 'Список всех проверенных пользователей'
                },
                {
                    type: 'article',
                    id: 'instruction',
                    thumbnail_url: INLINE_QUERY_PATHS.USERNAME_SEARCH,
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
            const { textInfo, formsCount, status } = this.telegramService.formatScammerData(scammer, false, 'ru', false, false);

            results.push({
                type: 'article',
                id: 'scammer_found',
                thumbnail_url: INLINE_QUERY_PATHS[status],
                title: `${status} найден`,
                input_message_content: {
                    message_text: textInfo,
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