import { DatabaseService } from '@/database/database.service';
import { UsersService } from '@/users/users.service';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Input, Telegraf } from 'telegraf';
import { InputFile } from 'telegraf/typings/core/types/typegram';

@Injectable()
export class TelegramService {
  constructor(
    @InjectBot() private readonly bot: Telegraf,
    @Inject('DEFAULT_BOT_NAME') private readonly botName: string,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly database: DatabaseService,
    private readonly configService: ConfigService
  ) { }

  getPhotoStream(filePath: string): InputFile {
    return Input.fromLocalFile(filePath)
  }

  async sendMessage(telegramId: string, message: string) {
    return await this.bot.telegram.sendMessage(telegramId, message)
  }



  isUserHasAccept(telegramId: string, arrAccepted: string[]): boolean {

    return arrAccepted.includes(telegramId)

  }

}