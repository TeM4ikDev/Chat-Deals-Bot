import { UserCheckMiddleware } from "@/auth/strategies/telegram.strategy";
import { DatabaseService } from "@/database/database.service";
import { UseGuards } from "@nestjs/common";
import { Command, Ctx, Update } from "nestjs-telegraf";
import { Context } from "telegraf";

@UseGuards(UserCheckMiddleware)
@Update()
export class GarantsUpdate {
    constructor(
        private readonly database: DatabaseService
    ) { }

    @Command('garants')
    async showGarants(@Ctx() ctx: Context) {
        const garants = await this.database.garants.findMany()
        
        if (garants.length === 0) {
            ctx.reply(
            `
            ❌ Список гарантов пуст.
                
В данный момент нет доступных гарантов.
            `)
            return
        }
        
        ctx.reply(`
            ✅ Список надежных гарантов:

${garants.map((g) => `• @${g.username}`).join('\n')}
        `)
    }
}