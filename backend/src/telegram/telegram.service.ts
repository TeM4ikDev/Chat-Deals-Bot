import { DatabaseService } from '@/database/database.service';
import { ScamformService } from '@/scamform/scamform.service';
import { IMessageDataScamForm, IScammerData } from '@/types/types';
import { UsersService } from '@/users/users.service';
import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Scammer, ScammerStatus } from '@prisma/client';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Input, Telegraf } from 'telegraf';
import { InlineQueryResult, InputFile, InputMediaPhoto, InputMediaVideo } from 'telegraf/typings/core/types/typegram';
import { BOT_NAME } from './constants/telegram.constants';
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

  private mainGroupName: string = this.configService.get<string>('MAIN_GROUP_NAME')

  async onModuleInit() {
    this.bot.on('inline_query', async (ctx) => {
      console.log('bot start')
      await this.handleInlineQuery(ctx);
    });
  }


  async checkIsMessageNotPrivate(ctx: Context): Promise<boolean> {
    return ctx.message.chat.type !== 'private'
  }

  async uploadFilesGroup(files: any[]): Promise<Array<{ type: string; file_id: string }>> {
    const media = files.map((file) => {
      const isVideo = file.mimetype?.startsWith('video/');

      if (isVideo) {
        return {
          type: 'video' as const,
          media: Input.fromBuffer(file.buffer, file.originalname || 'video.mp4')
        } as InputMediaVideo;
      } else {
        return {
          type: 'photo' as const,
          media: Input.fromBuffer(file.buffer, file.originalname || 'image.jpg')
        } as InputMediaPhoto;
      }
    });

    const sent = await this.bot.telegram.sendMediaGroup('@imagesbase', media);

    const fileIds: Array<{ type: string; file_id: string }> = sent.map(
      (msg) => {
        if ('photo' in msg && msg.photo && msg.photo.length > 0) {
          return {
            type: 'photo',
            file_id: msg.photo[msg.photo.length - 1].file_id
          };
        }
        if ('video' in msg && msg.video) {
          return {
            type: 'video',
            file_id: msg.video.file_id
          };
        }
        return null;
      }
    ).filter((item): item is { type: string; file_id: string } => item !== null);

    return fileIds;
  }

  getPhotoStream(filePath: string): InputFile {
    return Input.fromLocalFile(filePath)
  }

  async sendMessage(telegramId: string, message: string, options?: any) {
    return await this.bot.telegram.sendMessage(telegramId, message, options)
  }

  async replyWithAutoDelete(ctx: Context, text: string, options?: any, deleteAfterMs: number = 8000) {
    const message = await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...options
    });

    // if (!await this.checkIsMessageNotPrivate(ctx)) return

    setTimeout(async () => {
      try {
        await ctx.deleteMessage(message.message_id);
        if(ctx?.message?.message_id) await ctx.deleteMessage(ctx.message.message_id);
      } catch (error: any) {
        console.log('Не удалось удалить сообщение:', error.message);
      }
    }, deleteAfterMs);

    return message;
  }

  async replyMediaWithAutoDelete(ctx: Context, source: InputFile | string, options: any, mediaType: 'photo' | 'video', deleteAfterMs: number = 60000) {

    const message = mediaType === 'photo' ? await ctx.replyWithPhoto(source, {parse_mode: 'Markdown', ...options}) : await ctx.replyWithVideo(source, {parse_mode: 'Markdown', ...options});

    // if (!await this.checkIsMessageNotPrivate(ctx)) return

    setTimeout(async () => {
      try {
        await ctx.deleteMessage(message.message_id);
        if(ctx?.message?.message_id) await ctx.deleteMessage(ctx.message.message_id);
      } catch (error: any) {
        console.log('Не удалось удалить сообщение:', error.message);
      }
    }, deleteAfterMs);
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
    const scammerInfo: string = complaint.scammer.telegramId || complaint.scammer.username
    let textReq: string;

    switch (status) {
      case ScammerStatus.SCAMMER:
        textReq = `✅ Исход вашей жалобы \`${complaint.id}\` на \`${scammerInfo}\`.\nАккаунт добавлен в базу мошенников.`;
        break;

      case ScammerStatus.SUSPICIOUS:
        textReq = `☑️ Исход вашей жалобы \`${complaint.id}\` на \`${scammerInfo}\`.\nПользователь добавлен в базу подозрительных аккаунтов.`;
        break;

      case ScammerStatus.UNKNOWN:
      default:
        textReq = `🚫 Ваша жалоба \`${complaint.id}\` на \`${scammerInfo}\` отклонена.\n\nПричина: Недостаточность / неинформативность / невалидность отправленных вами доказательств.\n\nУчтите это, соберите доказательства повторно и отправьте жалобу заново.`;
        break;
    }

    await this.sendMessage(complaint.user.telegramId, textReq, {
      parse_mode: 'Markdown',
    })
  }


  private async handleInlineQuery(ctx: Context) {
    const query = ctx.inlineQuery.query.trim().replace(/^@/, '');

    console.log(query)

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
            message_text: `✅ **Проверенный гарант!**\n\n👤 **Пользователь:** @${this.escapeMarkdown(query)}\n\n💎 Этот пользователь является проверенным гарантом проекта.\n\n✅ Рекомендуем проводить сделки через этого гаранта.`,
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

    console.log(scammer)

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
      const username = scammer.username ? `@${(scammer.username)}` : 'Без username';
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

    const escapedUsername = this.escapeMarkdown(username)
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


  formatTwinAccounts(twinAccounts: IScammerData[]): string {
    if (twinAccounts.length === 0) return '—';
    return twinAccounts.map(twin => `• ${this.formatUserInfo(twin.username, twin.telegramId)}`).join('\n');
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
    return text.replace(/[_*[\]()~`>#+=|{}-]/g, '\\$&');
  }

  formatUserLink(id: number | string, firstName: string, username?: string): string {

    const escapedUsername = this.escapeMarkdown(username)
    const userLink = username
      ? `[${firstName}](https://t.me/${escapedUsername})`
      : `[${firstName}](tg://user?id=${id})`;

    return `${userLink} (ID: \`${id}\`)`;
  }


  async banScammerFromGroup(scammer: Scammer) {
    try {


      console.log('banScammerFromGroup вызван для:', scammer.username, 'с telegramId:', scammer.telegramId);

      if (!scammer.telegramId || scammer.telegramId === '') {
        console.log('Invalid telegramId for ban:', scammer.telegramId);
        return;
      }

      const telegramId = Number(scammer.telegramId);
      const userText = this.formatUserLink(
        telegramId,
        scammer.username || 'Без имени',
        scammer.username || undefined,
      );

      console.log('Отправляем сообщение о бане для:', userText);

      await this.bot.telegram.sendMessage(
        this.mainGroupName,
        `${userText} забанен в чате`,
        {
          parse_mode: 'Markdown',
          link_preview_options: {
            is_disabled: true,
          },
        }
      );

      console.log('Баним пользователя с ID:', telegramId);
      await this.bot.telegram.banChatMember(this.mainGroupName, telegramId);

    } catch (error) {
      console.error('Error banning scammer:', error);
    }
  }



  async unbanScammerFromGroup(scammer: Scammer) {
    try {
      console.log('unbanScammerFromGroup вызван для:', scammer.username, 'с telegramId:', scammer.telegramId);

      if (!scammer.telegramId || scammer.telegramId === '') {
        console.log('Invalid telegramId for unban:', scammer.telegramId);
        return;
      }
      console.log('Разбаниваем пользователя с ID:', Number(scammer.telegramId));
      await this.bot.telegram.unbanChatMember(this.mainGroupName, Number(scammer.telegramId))
    } catch (error) {
      console.error('Error unbanning scammer:', error);
    }
  }


  async sendScamFormMessageToChannel(messageData: IMessageDataScamForm) {
    const { fromUser, scamForm, scammerData } = messageData
    const channelId = '@qyqly';
    const userInfo = fromUser.username ? `@${this.escapeMarkdown(fromUser.username)}` : `ID: ${fromUser.telegramId}`;

    const { username, telegramId } = scammerData
    const scammerInfo = this.formatUserInfo(username, telegramId);
    const encoded = this.encodeParams({ id: telegramId, formId: scamForm.id })
    const description = this.escapeMarkdown(scamForm.description)

    const channelMessage = this.localizationService.getT('complaint.form.channelMessage', "ru")
      .replace('{botName}', BOT_NAME)
      .replace('{scammerInfo}', scammerInfo)
      .replace('{twinAccounts}', this.formatTwinAccounts(scammerData.twinAccounts))
      .replace('{description}', description || '')
      .replace('{encoded}', encoded)
      .replace('{userInfo}', userInfo);

    const reply_markup = {
      inline_keyboard:
        [[
          { text: '👍 0', callback_data: `like_complaint:${scamForm.id}` },
          { text: '👎 0', callback_data: `dislike_complaint:${scamForm.id}` }
        ]]
    }

    try {
      let replyToMessageId: number | undefined;
      const media = messageData.media;

      if (media.length > 0) {
        const mediaGroup = media.slice(0, 10).map((m) => ({
          type: m.type === 'photo' ? 'photo' : 'video',
          media: m.file_id
        }));

        const messages = await this.sendMediaGroupToChannel(channelId, mediaGroup);

        if (messages && messages.length > 0) {
          replyToMessageId = messages[0].message_id;
        }
      }

      await this.sendMessageToChannelLayer(channelId, channelMessage, {
        parse_mode: 'Markdown',
        reply_markup,
        reply_to_message_id: replyToMessageId,
        link_preview_options: {
          is_disabled: true,
        },
      });
    } catch (error) {
      console.error('Error sending to channel:', error);
    }
  }



}