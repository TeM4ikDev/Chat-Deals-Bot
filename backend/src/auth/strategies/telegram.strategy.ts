// backend/src/telegram/middlewares/user-check.middleware.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Context } from 'telegraf';
import { UsersService } from '@/users/users.service';
import { DatabaseService } from '@/database/database.service';


@Injectable()
export class UserCheckMiddleware implements CanActivate {
    constructor(private readonly usersService: UsersService, private readonly database: DatabaseService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const ctx = context.switchToHttp().getRequest<Context>();

        if (ctx.callbackQuery && 'data' in ctx.callbackQuery &&
            typeof ctx.callbackQuery.data === 'string' &&
            ctx.callbackQuery.data.includes('get_access')
        ) {
            return true;
        }

        const user = await this.usersService.findOrCreateUser(ctx.from);

        // if (!user.hasAccess) {
        //     await ctx.reply('У вас нет доступа к этому боту.', {
        //         reply_markup: {
        //             inline_keyboard: [
        //                 [{ text: 'Запросить доступ', callback_data: 'get_access' }]
        //             ]
        //         }
        //     });



        //     return false;
        // }

        

        // console.log('check user', user)

        return true;
    }
}