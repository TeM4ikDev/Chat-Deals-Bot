import { DatabaseService } from '@/database/database.service';
import { ScamformService } from '@/scamform/scamform.service';
import { UsersService } from '@/users/users.service';
import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ScammerStatus } from '@prisma/client';
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
    private readonly localizationService: LocalizationService,
    private readonly telegramService: TelegramService

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
          title: 'Введите @username для поиска',
          input_message_content: {
            message_text: '🔍 Введите @username для поиска в базе',
          },
          description: 'Начните вводить username',
        },
      ];
      await ctx.answerInlineQuery(results);
      return;
    }

    console.log('Inline query:', query);

    // Проверяем, является ли пользователь гарантом
    const garants = await this.usersService.findGarants();
    const isGarant = garants.some(garant => 
      garant.username?.toLowerCase() === query.toLowerCase()
    );

    if (isGarant) {
      const results: InlineQueryResult[] = [
        {
          type: 'article',
          id: 'garant_found',
          title: '✅ Проверенный гарант найден',
          input_message_content: {
            message_text: `✅ **Проверенный гарант!**\n\n👤 **Пользователь:** @${query}\n\n💎 Этот пользователь является проверенным гарантом проекта.\n\n✅ Рекомендуем проводить сделки через этого гаранта.`,
            parse_mode: 'Markdown',
          },
          description: 'Пользователь найден в базе гарантов',
        },
      ];
      await ctx.answerInlineQuery(results);
      return;
    }

    // Ищем скаммера
    const scammer = await this.scamformService.getScammerByQuery(query);

    const results: InlineQueryResult[] = [];
    if (!scammer) {
      results.push({
        type: 'article',
        id: 'not_found',
        title: 'Пользователь не найден',
        input_message_content: {
          message_text: `🔍 Пользователь не найден в базе.\n\n⚠️ Помните: даже если пользователь отсутствует в базе, это **не гарантирует** его надежность.\n\n✅ Рекомендуем проводить сделки только через проверенного гаранта.`,
          parse_mode: 'Markdown',
        },
        description: 'Пользователь не найден в базе',
      });
    } else {
      const username = scammer.username ? `@${scammer.username}` : 'Без username';
      const telegramId = scammer.telegramId || '--';
      const formsCount = scammer.scamForms.length;
      const status = this.getScammerStatusText(scammer);

      results.push({
        type: 'article',
        id: 'scammer_found',
        title: `${status} найден`,
        input_message_content: {
          message_text: `*${username}*\n\nID: \`${telegramId}\`\nСтатус: *${scammer.status}*\nЖалоб: *${formsCount}*\n\n[🔍 Посмотреть в приложении](https://t.me/svdbasebot/scamforms?startapp=${scammer.username || scammer.telegramId})`,
          parse_mode: 'Markdown',
        },
        description: `${status} • ${formsCount} жалоб`,
      });
    }

    await ctx.answerInlineQuery(results);
  }


  formatUserInfo(username?: string, telegramId?: string, language: string = 'ru'): string {

    const escapedUsername = this.telegramService.escapeMarkdown(username)
    if (username && telegramId) {
      return this.localizationService.getT('userInfo.withUsernameAndId', language)
        .replace('{username}', escapedUsername)
        .replace('{telegramId}', telegramId);
    } else if (username) {
      return this.localizationService.getT('userInfo.withUsernameOnly', language)
        .replace('{username}', escapedUsername);
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

  escapeMarkdown(text: string): string {
    if (!text) return text;
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
  }



}