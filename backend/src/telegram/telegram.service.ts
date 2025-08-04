import { DatabaseService } from '@/database/database.service';
import { ScamformService } from '@/scamform/scamform.service';
import { UsersService } from '@/users/users.service';
import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Input, Telegraf } from 'telegraf';
import { InlineQueryResult, InputFile } from 'telegraf/typings/core/types/typegram';
import { LocalizationService } from './services/localization.service';

@Injectable()
export class TelegramService implements OnModuleInit {
  constructor(
    @InjectBot() private readonly bot: Telegraf,
    @Inject('DEFAULT_BOT_NAME') private readonly botName: string,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly database: DatabaseService,
    private readonly configService: ConfigService,
    private readonly scamformService: ScamformService,
    private readonly localizationService: LocalizationService

  ) { }

  getPhotoStream(filePath: string): InputFile {
    return Input.fromLocalFile(filePath)
  }

  async sendMessage(telegramId: string, message: string) {
    return await this.bot.telegram.sendMessage(telegramId, message)
  }

  async sendMessageToChannel(channelId: string, message: string, options?: any) {
    return await this.bot.telegram.sendMessage(channelId, message, options)
  }

  async forwardMessageToChannel(channelId: string, fromChatId: string, messageId: number) {
    return await this.bot.telegram.forwardMessage(channelId, fromChatId, messageId)
  }

  async sendMediaGroupToChannel(channelId: string, mediaGroup: any[]) {
    return await this.bot.telegram.sendMediaGroup(channelId, mediaGroup)
  }

  isUserHasAccept(telegramId: string, arrAccepted: string[]): boolean {
    return arrAccepted.includes(telegramId)
  }

  onModuleInit() {
    this.bot.on('inline_query', async (ctx) => {
      await this.handleInlineQuery(ctx);
    });
  }

  private async handleInlineQuery(ctx: Context) {
    const query = ctx.inlineQuery.query.trim().replace(/^@/, '');

    if (!query) {
      const results: InlineQueryResult[] = [
        {
          type: 'article',
          id: 'instruction',
          title: 'Введите @username для поиска мошенников',
          input_message_content: {
            message_text: '🔍 Введите @username мошенника для поиска в базе жалоб',
          },
          description: 'Начните вводить username мошенника',
        },
      ];
      await ctx.answerInlineQuery(results);
      return;
    }

    const {scammers} = await this.scamformService.getScammers(1, 10, query);

    const results: InlineQueryResult[] = [];
    if (scammers.length === 0) {
      results.push({
        type: 'article',
        id: 'not_found',
        title: 'Мошенник не найден',
        input_message_content: {
          message_text: `❌ Мошенник с username "${query}" не найден в базе жалоб`,
        },
        description: 'Попробуйте другой username',
      });
    } else {
      scammers.forEach((scammer, index) => {
        const displayName = scammer.username || scammer.telegramId || 'Неизвестный';
      
        results.push({
          type: 'article',
          id: `scammer_${index}`,
          title: scammer.username ? `@${scammer.username}` : `ID: ${scammer.telegramId}`,
          input_message_content: {
            message_text: 
`
├ Username: ${scammer.username ? `@${scammer.username}` : 'не указан'}
├ Telegram ID: ${scammer.telegramId || 'не указан'}
└ Кол-во жалоб: ${scammer.scamForms}
[Просмотреть жалобы](https://svdscambasebot.ru/scamforms?startapp=${scammer.username || scammer.telegramId})
            `.trim(),
            parse_mode: 'Markdown',

          },
          description: `${displayName} • ${scammer.scamForms} жалоб`,
        });
      })
    }

    await ctx.answerInlineQuery(results);
  }


  formatUserInfo(username?: string, telegramId?: string, language: string = 'ru'): string {
    if (username && telegramId) {
        return this.localizationService.getT('userInfo.withUsernameAndId', language)
            .replace('{username}', username)
            .replace('{telegramId}', telegramId);
    } else if (username) {
        return this.localizationService.getT('userInfo.withUsernameOnly', language)
            .replace('{username}', username);
    } else if (telegramId) {
        return this.localizationService.getT('userInfo.withIdOnly', language)
            .replace('{telegramId}', telegramId);
    } else {
        return this.localizationService.getT('userInfo.noInfo', language);
    }
}




 
}