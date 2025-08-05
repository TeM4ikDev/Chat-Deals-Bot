import { DatabaseService } from '@/database/database.service';
import { ScamformService } from '@/scamform/scamform.service';
import { UsersService } from '@/users/users.service';
import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Input, Telegraf } from 'telegraf';
import { InlineQueryResult, InputFile } from 'telegraf/typings/core/types/typegram';
import { LocalizationService } from './services/localization.service';
import { Prisma, ScammerStatus } from '@prisma/client';

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

  onModuleInit() {
    this.bot.on('inline_query', async (ctx) => {
      await this.handleInlineQuery(ctx);
    });
  }

  getPhotoStream(filePath: string): InputFile {
    return Input.fromLocalFile(filePath)
  }

  async sendMessage(telegramId: string, message: string) {
    return await this.bot.telegram.sendMessage(telegramId, message)
  }

  async sendMessageToChannelLayer(channelId: string, message: string, options?: any) {
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


  async complaintOutcome(
    complaint: Prisma.ScamFormGetPayload<{ include: { scammer, user } }>,
    status: ScammerStatus,
  ) {
    const scammerInfo: string = complaint.user.telegramId || complaint.user.username
    let textReq: string;

    switch (status) {
      case ScammerStatus.SCAMMER:
        textReq = `✅ Исход вашей жалобы на ${scammerInfo}. Аккаунт добавлен в базу мошенников`;
        break;

      case ScammerStatus.SUSPICIOUS:
        textReq = `☑️ Исход вашей жалобы на #${scammerInfo}. Пользователь добавлен в базу подозрительных аккаунтов.`;
        break;

      case ScammerStatus.UNKNOWN:
      default:
        textReq = `🚫 Ваша жалоба на #${scammerInfo} отклонена.\n\nПричина: Недостаточность / неинформативность / невалидность отправленных вами доказательств. Учтите это, соберите доказательства повторно и отправьте жалобу заново.`;
        break;
    }

    await this.sendMessage(complaint.user.telegramId, textReq)
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


    console.log(query)

    const { scammers } = await this.scamformService.getScammers(undefined, undefined, query);

    console.log(scammers)

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

        results.push({
          type: 'article',
          id: `scammer_${index}`,
          title: scammer.username ? `@${scammer.username}` : `ID: ${scammer.telegramId}`,
          input_message_content: {
            // photo_url: 
            message_text:
              `
├ Username: ${scammer.username ? `@${scammer.username}` : 'не указан'}
├ Telegram ID: ${scammer.telegramId || 'не указан'}
└ Кол-во жалоб: ${scammer.scamForms.length}
[Просмотреть жалобы](https://svdbasebot/scamforms?startapp=${scammer.username || scammer.telegramId})
            `.trim(),
            parse_mode: 'Markdown',

          },
          description: `${this.getScammerStatusText(scammer)} • ${scammer.scamForms.length} жалоб`,
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

  encodeParams(payload: {}) {
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  getScammerStatusText(scammer: Prisma.ScammerGetPayload<{}>) {
    switch (scammer.status) {
      case ScammerStatus.SCAMMER:
        return "Скамер"
      case ScammerStatus.SUSPICIOUS:
        return "Подозрительный"
      case ScammerStatus.UNKNOWN:
        return "Неизвестный"
      default:
        return "Неизвестный"
    }
  }



}