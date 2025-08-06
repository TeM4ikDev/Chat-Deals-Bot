import { UserCheckMiddleware } from "@/auth/strategies/telegram.strategy";
import { DatabaseService } from "@/database/database.service";
import { UsersService } from "@/users/users.service";
import { UseGuards } from "@nestjs/common";
import { Command, Ctx, Update } from "nestjs-telegraf";
import { Context } from "telegraf";
import { Language } from "../decorators/language.decorator";
import { LocalizationService } from "../services/localization.service";

@UseGuards(UserCheckMiddleware)
@Update()
export class GarantsUpdate {
    constructor(
        private readonly database: DatabaseService,
        private readonly localizationService: LocalizationService,
        private readonly userService: UsersService
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
            
            // Экранируем специальные символы Markdown
            const escapedDescription = description
                .replace(/\*/g, '\\*')
                .replace(/_/g, '\\_')
                .replace(/`/g, '\\`')
                .replace(/\[/g, '\\[')
                .replace(/\]/g, '\\]')
                .replace(/\(/g, '\\(')
                .replace(/\)/g, '\\)')
                .replace(/#/g, '\\#')
                .replace(/\+/g, '\\+')
                .replace(/-/g, '\\-')
                .replace(/=/g, '\\=')
                .replace(/\|/g, '\\|')
                .replace(/\{/g, '\\{')
                .replace(/\}/g, '\\}')
                .replace(/\./g, '\\.')
                .replace(/!/g, '\\!')
            
            return `🔸 ${number}. @${garant.username}\n   ${escapedDescription}`
        }).join('\n\n')

        const totalCount = garants.length
        const header = this.localizationService.getT('garant.header', lang)
            .replace('{count}', totalCount.toString())
        

        const message = `${header}${garantsList}`

        ctx.reply(message)
    }
}