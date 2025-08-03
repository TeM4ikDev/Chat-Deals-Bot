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

        ctx.reply(this.localizationService.getT('garant.show', lang).replace('{garants}', garants.map((g) => `• @${g.username}`).join('\n')))
    }
}