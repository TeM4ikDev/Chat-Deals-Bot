import { UserCheckMiddleware } from "@/auth/strategies/telegram.strategy";
import { DatabaseService } from "@/database/database.service";
import { UsersService } from "@/users/users.service";
import { UseGuards } from "@nestjs/common";
import { Command, Ctx, Update } from "nestjs-telegraf";
import { Context } from "telegraf";
import { Language } from "../decorators/language.decorator";
import { LocalizationService } from "../services/localization.service";
import { TelegramService } from "../telegram.service";

@UseGuards(UserCheckMiddleware)
@Update()
export class GarantsUpdate {
    constructor(
        private readonly database: DatabaseService,
        private readonly localizationService: LocalizationService,
        private readonly userService: UsersService,
        private readonly telegramService: TelegramService
    ) { }

    @Command('garants')
    async showGarants(@Ctx() ctx: Context, @Language() lang: string) {
        const garants = await this.userService.findGarants()

        if (garants.length === 0) {
            ctx.reply(this.localizationService.getT('garant.notFound', lang))
            return
        }

        const garantsList = garants.map((garant, index) => {
            const number = index + 1
            const description = garant.description || this.localizationService.getT('garant.defaultDescription', lang)

            return `🔸 ${number}. @${this.telegramService.escapeMarkdown(garant.username)}\n   ${this.telegramService.escapeMarkdown(description)}`
        }).join('\n\n')

        const totalCount = garants.length
        const header = this.localizationService.getT('garant.header', lang)
            .replace('{count}', totalCount.toString())

        const message = `${header}${garantsList}\n\n @TeM4ik20 - разраб`

        this.telegramService.replyWithAutoDelete(ctx, message, undefined, 30000)
    }

    @Command('stat')
    async showStat(@Ctx() ctx: Context, @Language() lang: string) {
        const stat = await this.userService.getTopUsersWithScamForms()

        const message = stat.map((user, index) => {
            const number = index + 1
            const isUsername = user.username ? `[${this.telegramService.escapeMarkdown(user.firstName)}](https://t.me/${user.username})` : this.telegramService.escapeMarkdown(user.firstName)
            return `🔸 ${number}. ${isUsername} ${user.ScamForms.length}`
        }).join('\n')

        this.telegramService.replyWithAutoDelete(ctx, message, undefined, 30000)
    }

}