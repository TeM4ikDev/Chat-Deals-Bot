import { DatabaseService } from '@/database/database.service';
import { ScamformService } from '@/scamform/scamform.service';
import { banStatuses, IMessageDataScamForm, IScammerData, IScammerPayload } from '@/types/types';
import { UsersService } from '@/users/users.service';
import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatConfig, Prisma, Scammer, ScammerStatus } from '@prisma/client';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Input, Telegraf } from 'telegraf';
import { InlineKeyboardButton, InlineQueryResult, InputFile, InputMediaPhoto, InputMediaVideo, User } from 'telegraf/typings/core/types/typegram';
import { BOT_NAME, IMAGE_PATHS } from './constants/telegram.constants';
import { LocalizationService } from './services/localization.service';
import { AdminService } from '@/admin/admin.service';
import { BusinessModeUpdate } from './updates/businessMode.update';
import * as fs from 'fs';


@Injectable()
export class TelegramService {
  constructor(
    @InjectBot() private readonly bot: Telegraf,
    @Inject('DEFAULT_BOT_NAME') private readonly botName: string,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly database: DatabaseService,
    private readonly configService: ConfigService,
    private readonly scamformService: ScamformService,
    private readonly localizationService: LocalizationService,
    @Inject(forwardRef(() => AdminService))
    private readonly adminService: AdminService,

    // @Inject(forwardRef(() => BusinessModeUpdate))
    private readonly businessModeUpdate: BusinessModeUpdate
  ) { }

  private mainGroupName: string = this.configService.get<string>('MAIN_GROUP_NAME')


  async onModuleInit() {
    // const user  = await this.bot.telegram.('@imagesbase', 1162525174)
    // console.log(user)
  }


  async checkStartPayload(ctx: Context): Promise<boolean> {
    const startPayload = (ctx as any).startPayload
    if (!startPayload) return false

    const command = startPayload.split('_')[0]
    const commandData: string = startPayload.split('_')[1]

    switch (command) {
      case 'chatActions':
        console.log(commandData)
        await this.businessModeUpdate.onChatActions(ctx, Number(commandData))
        await ctx.deleteMessage()
        return true
      default:
        return false
    }

    return false
  }

  async checkIsChatPrivate(ctx: Context): Promise<boolean> {
    return ctx.message.chat.type === 'private'
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

  async replyWithAutoDelete(ctx: Context, text: string, options?: any, deleteAfterMs: number = 15000) {
    const message = await ctx.reply(text, {
      parse_mode: 'Markdown',
      link_preview_options: {
        is_disabled: true,
      },
      ...options
    });

    // if (await this.checkIsChatPrivate(ctx)) return

    setTimeout(async () => {
      try {
        await ctx.deleteMessage(message.message_id);
        if (ctx?.message?.message_id) await ctx.deleteMessage(ctx.message.message_id);
      } catch (error: any) {
        console.log('Не удалось удалить сообщение:', error.message);
      }
    }, deleteAfterMs);

    return message;
  }

  async replyMediaWithAutoDelete(ctx: Context, source: InputFile | string, options: any, mediaType: 'photo' | 'video', deleteAfterMs: number = 60000, isDisable: boolean = true) {

    const message = mediaType === 'photo' ?
      await ctx.replyWithPhoto(source, {
        parse_mode: 'Markdown',
        link_preview_options: {
          is_disabled: true,
        }, ...options
      })
      : await ctx.replyWithVideo(source, {
        parse_mode: 'Markdown',
        link_preview_options: {
          is_disabled: true,
        }, ...options
      });

    // if (await this.checkIsChatPrivate(ctx)) return

    if (await this.checkIsChatPrivate(ctx)) {
      return
    }

    // if (isDisable) {
    //   return
    // }

    setTimeout(async () => {
      try {
        await ctx.deleteMessage(message.message_id);
        if (ctx?.message?.message_id) await ctx.deleteMessage(ctx.message.message_id);
      } catch (error: any) {
        console.log('Не удалось удалить сообщение:', error.message);
      }
    }, deleteAfterMs);
  }

  async sendMessageToChannelLayer(channelId: string, message: string, options?: any) {
    return await this.bot.telegram.sendMessage(channelId, message, options)
  }

  async forwardMessage(channelId: string, fromChatId: string, messageId: number) {
    return await this.bot.telegram.forwardMessage(channelId, fromChatId, messageId)
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

  async checkIsGarant(username: string): Promise<boolean> {
    const garants = await this.usersService.findGarants();

    if (!username) return false;

    return garants.some(garant =>
      garant.username?.toLowerCase() === username.toLowerCase()
    );
  }

  formatUserInfo(userData: IScammerData, language: string = 'ru', escapeMarkdown: boolean = true): string {
    const { username, telegramId, twinAccounts, collectionUsernames } = userData
    const escapedUsername = escapeMarkdown ? this.escapeMarkdown(username) : username
    if (username && telegramId) {
      return this.localizationService.getT('userInfo.withUsernameAndId', language)
        .replace('{username}', escapedUsername)
        .replace('{telegramId}', telegramId)
        .replace('{collectionUsernames}', `${collectionUsernames?.length > 0 ? ` | ${collectionUsernames?.map(username => `@${this.escapeMarkdown(username)}`).join(', ')}` : ''}`)
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
    if (!twinAccounts || twinAccounts?.length === 0) return '—';
    return twinAccounts.map(twin => `• ${(this.formatUserInfo(twin, 'ru', false))}`).join('\n')
  }

  encodeParams(payload: {}) {
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  getScammerStatusText(scammer: Prisma.ScammerGetPayload<{}>) {
    switch (scammer.status) {
      case ScammerStatus.SCAMMER:
        return "Скамер"
      case ScammerStatus.SPAMMER:
        return "Спаммер"
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
    return text.replace(/[_*[\]()~`>#+=|{}.]/g, '\\$&');
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


    // const { textInfo } = this.formatScammerData(scammerData as IScammerPayload, false, "ru")
    const userInfo = fromUser.username ? `@${this.escapeMarkdown(fromUser.username)}` : `ID: ${fromUser.telegramId}`;

    const scammerInfo = this.formatUserInfo(scammerData);
    const encoded = this.encodeParams({ id: scammerData.telegramId, formId: scamForm.id })
    const description = this.escapeMarkdown(scamForm.description)

    const channelMessage = this.localizationService.getT('complaint.form.channelMessage', "ru")
      .replace('{botName}', BOT_NAME)
      .replace('{scammerInfo}', scammerInfo)
      .replace('{twinAccounts}', this.formatTwinAccounts(scammerData.twinAccounts))
      .replace('{description}', description || '')
      .replace('{encoded}', encoded)
      .replace('{userInfo}', userInfo);

    // const reply_markup = {
    //   inline_keyboard:
    //     [[
    //       { text: '👍 0', callback_data: `like_complaint:${scamForm.id}` },
    //       { text: '👎 0', callback_data: `dislike_complaint:${scamForm.id}` }
    //     ]]
    // }

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
        // reply_markup,
        reply_to_message_id: replyToMessageId,
        link_preview_options: {
          is_disabled: true,
        },
      });
    } catch (error) {
      console.error('Error sending to channel:', error);
    }
  }

  async sendNewUserMessage(ctx: Context, newMember: User) {
    // console.log('sendNewUserMessage', ctx.chat)
    const chatUsername = (ctx as any).chat.username

    const message = await this.adminService.findChatConfigByUsername(chatUsername)
    if (!message) return
    // console.log('message', message)
    const newUser = await this.scamformService.findOrCreateScammer(newMember.username, newMember.id.toString())


    if (banStatuses.includes(newUser.status)) {
      this.banScammerFromGroup(newUser)
    }
    // console.log(newUser)

    const userLink = newUser.username
      ? `[${this.escapeMarkdown(newMember.first_name)}](https://t.me/${newMember.username})`
      : `[${this.escapeMarkdown(newMember.first_name)}](tg://user?id=${newMember.id})`;

    const userInfo = message.showNewUserInfo ?
      `• Статус: \`${newUser.status}\`\n` +
      `• Количество жалоб: \`${newUser.scamForms.length || 0}\`\n\n` : ''

    const userRulesLink = message.rulesTelegramLink ? `📖 Пожалуйста, ознакомься с [правилами чата](${message.rulesTelegramLink})\n\n` : ''

    await this.replyWithAutoDelete(ctx,
      `👋 Привет, ${userLink}!\n` +
      `🎉 Добро пожаловать в @${this.escapeMarkdown(chatUsername)}!\n\n` +
      `${this.escapeMarkdown(message.newUserMessage || '')}\n\n` +
      userInfo +
      userRulesLink +
      "разработчик бота: [Artem](https://t.me/TeM4ik20)",
      {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true }
      },
      30000
    );
  }

  async getChatConfig() {
    return await this.usersService.findUsersConfig()
  }

  async sendChatAutoMessage(chatConfig: ChatConfig) {
    const { autoMessageId, autoMessageIntervalSec, autoMessageKeyboardUrls } = chatConfig
    if (!autoMessageId || !autoMessageIntervalSec) return
    const [chatFromUsername, messageId] = autoMessageId.split('/').slice(-2)

    const chatCopyFrom = `@${chatFromUsername}`

    const message = await this.bot.telegram.copyMessage(chatCopyFrom, `@${chatConfig.username}`, Number(messageId))

    await this.bot.telegram.editMessageReplyMarkup(chatCopyFrom, message.message_id, undefined, {
      inline_keyboard: JSON.parse(autoMessageKeyboardUrls as string) as InlineKeyboardButton[][]
    })
  }

  formatScammerData(scammer: IScammerPayload, photo: boolean = false, lang: string = 'ru', withWarning: boolean = false) {
    console.log('scammer format data', scammer)
    
    let username = this.escapeMarkdown(scammer.username || scammer.telegramId || 'без username');
    username = `${username} ${scammer.collectionUsernames && scammer?.collectionUsernames?.length > 0 ? `(${scammer?.collectionUsernames?.map((username: any) => `@${this.escapeMarkdown(username.username || username)}`).join(', ')})` : ''}`;
    const telegramId = scammer.telegramId || '--';
    const registrationDate = this.formatRegistrationDate(scammer.registrationDate, lang);
    const formsCount = scammer?.scamForms?.length || 0;
    const status = scammer.status
    const views = scammer.views?.length || 0;


    console.log(scammer.mainScamForm)
    let description = this.escapeMarkdown(scammer.description || scammer.mainScamForm?.description || 'нет описания')
    const link = `https://t.me/svdbasebot/scamforms?startapp=${scammer.username || scammer.telegramId}`;
    let photoStream = photo ? fs.createReadStream(IMAGE_PATHS[status]) : null;
    const twinAccounts = this.formatTwinAccounts(scammer.twinAccounts)


    let textInfo = ''

    if (withWarning && status == 'UNKNOWN') {
      textInfo = this.localizationService.getT('userCheck.userDetailsWithWarning', lang)
      .replace('{username}', username)
      .replace('{telegramId}', telegramId)
      .replace('{registrationDate}', registrationDate || '--')
      .replace('{status}', status)
      .replace('{formsCount}', formsCount.toString())
      .replace('{description}', description)
      .replace('{twinAccounts}', twinAccounts)
      .replace('{link}', link)
      .replace('{views}', views.toString())
    }
    else{
      textInfo = this.localizationService.getT('userCheck.userDetails', lang)
      .replace('{username}', username)
      .replace('{telegramId}', telegramId)
      .replace('{registrationDate}', registrationDate || '--')
      .replace('{status}', status)
      .replace('{formsCount}', formsCount.toString())
      .replace('{description}', description)
      .replace('{twinAccounts}', twinAccounts)
      .replace('{link}', link)
      .replace('{views}', views.toString())
    }

    

    return {
      textInfo,
      username,
      telegramId,
      registrationDate,
      formsCount,
      status,
      description,
      link,
      photoStream,
      twinAccounts,
      views
    }
  }

  formatRegistrationDate(date: Date, language: string = 'ru'): string | null {
    if (!date) return null
    return date.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' })
  }

  testIsUsername(username: string): boolean {
    const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;
    return USERNAME_REGEX.test(username.replace('@', ''));
  }

  testIsTelegramId(telegramId: string): boolean {
    return /^\d+$/.test(telegramId.toString());
  }
}