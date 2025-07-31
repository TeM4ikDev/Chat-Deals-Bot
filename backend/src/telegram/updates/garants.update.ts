import { UserCheckMiddleware } from "@/auth/strategies/telegram.strategy";
import { UseGuards } from "@nestjs/common";
import { Command, Ctx, Update } from "nestjs-telegraf";
import { TelegramUpdate } from "../telegram.update";
import { Context } from "telegraf";

@UseGuards(UserCheckMiddleware)
@Update()
export class GarantsUpdate {

    @Command('garants')
    async showGarants(@Ctx() ctx: Context) {

        ctx.reply(
            `
        ✅ Список надежных гарантов:

• @gid_garant
• @aizek
• @bIackkro
• @hooligan154
• @M_Brightside
• @quechulo_garant
• @garant_heisenberg
• @Alexander_Vart1
• @el_capitano8
• @A_preLskiy
• @ladesov
• @hamka`
        )

    }
}