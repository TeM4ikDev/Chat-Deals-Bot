// backend/src/telegram/middlewares/user-check.middleware.ts
import { DatabaseService } from '@/database/database.service';
import { UsersService } from '@/users/users.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Context } from 'telegraf';


@Injectable()
export class UserCheckMiddleware implements CanActivate {
    constructor(private readonly usersService: UsersService, private readonly database: DatabaseService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const ctx = context.switchToHttp().getRequest<Context>();

        // console.log('canActivate')

        const user = await this.usersService.findOrCreateUser(ctx.from);

        if (user.user.banned) {
            const cucumberPath = path.join(__dirname, '../../../public/ogurec.png');
            const photoStream = fs.createReadStream(cucumberPath);
            
            await ctx.replyWithPhoto(
                { source: photoStream },
                {
                    caption: 'У вас нет доступа к этому боту. Вы были забанены. Не расстраивайтесь, вот Дикий огурец',
                    parse_mode: 'Markdown',
                }
            );


            return false;
        }
        return true;
    }
}