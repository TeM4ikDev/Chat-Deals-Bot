import { UsersService } from '@/users/users.service';
import { ConfigService } from '@nestjs/config';
import { Context, Scenes } from 'telegraf';
import { IMAGE_PATH } from './constants/telegram.constants';
import { TelegramService } from './telegram.service';
import { InlineQuery as TgInlineQuery, InlineQueryResult } from 'telegraf/typings/core/types/typegram';
import { Ctx, InlineQuery, Update } from 'nestjs-telegraf';

export abstract class TelegramUpdate {
  protected image: any;

  constructor(
    protected readonly telegramService: TelegramService,
    protected readonly configService: ConfigService,
    protected readonly userService: UsersService,
  ) {
    this.image = this.telegramService.getPhotoStream(IMAGE_PATH);
  }


  protected async deleteMessage(ctx: Context, messageId: number) {
    try {
      await ctx.deleteMessage(messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }


 
}


