import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/database/database.service';
import { Context } from 'telegraf';
import { TelegramService } from '@/telegram/telegram.service';
import { UsersService } from '@/users/users.service';

@Injectable()
export class AdminService {
    constructor(
        private readonly database: DatabaseService,
    ) { }

    async findChatConfigByUsername(username: string) {
        // return await this.database.chatConfig.findUnique({
        //     where: {
        //         username
        //     }
        // })
    }


    // ____________________

}
