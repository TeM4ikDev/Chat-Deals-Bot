import { AdminService } from '@/admin/admin.service';
import { DatabaseService } from '@/database/database.service';
import {IMessageDataScamForm, IScammerData, IUserTwink } from '@/types/types';
import { UsersService } from '@/users/users.service';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Input, Telegraf } from 'telegraf';
import { InlineKeyboardButton, InputFile, InputMediaPhoto, InputMediaVideo, User } from 'telegraf/typings/core/types/typegram';
import { LocalizationService } from './services/localization.service';
import { FORM_LIMITS } from './constants/form-limits.constants';


@Injectable()
export class TelegramService {
  constructor(
    @InjectBot() private readonly bot: Telegraf,
    @Inject('DEFAULT_BOT_NAME') private readonly botName: string,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly database: DatabaseService,
    private readonly configService: ConfigService,
    private readonly localizationService: LocalizationService,
    @Inject(forwardRef(() => AdminService))
    private readonly adminService: AdminService,
  ) { }

  private mainGroupName: string = this.configService.get<string>('MAIN_GROUP_NAME')
  private scamFormsChannel = this.configService.get<string>('SCAM_FORMS_CHANNEL')


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
        // console.log(commandData)
        // await this.businessModeUpdate.onChatActions(ctx, Number(commandData))
        // await ctx.deleteMessage()
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


  async sendMessageToChannelLayer(channelId: string, message: string, options?: any) {
    try {
      return await this.bot.telegram.sendMessage(channelId, message, options)
    } catch (error: any) {
      console.log('Не удалось отправить сообщение:', error.message);
      return null;
    }
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

  formatUserInfo(dealsInfo: any){
    if (!dealsInfo) {
        return {info:`📝 <b>Информация профиля</b>\n\n❌ Информация не заполнена\n\nНажмите кнопку ниже, чтобы заполнить данные для сделок.`};
    }

    const addresses = dealsInfo.addresses ? JSON.parse(dealsInfo.addresses as string) : [];
    const keyboardUrls = dealsInfo.KeyboardUrls ? JSON.parse(dealsInfo.KeyboardUrls as string) : [];

    let result = `📝 <b>Информация профиля</b>\n\n`;
    let addressesText = '💰 <b>Адреса кошельков:</b>\n\n'

    // Адреса кошельков
    if (addresses.length > 0) {
        result += `💰 <b>Адреса кошельков:</b>\n`;
        addresses.forEach((address: string, index: number) => {
            result += `   ${index + 1}) <code>${address}</code>\n`;
            addressesText +=`${index + 1}) <code>${address}</code>\n`
        });
        
        addressesText+= '\nТакже можете отправить деньги быстро через кнопку ниже:'
        result += `\n`;
    } else {
        result += `💰 <b>Адреса кошельков:</b> ❌ Не указаны\n\n`;
    }

    // Ссылки для кнопок
    if (keyboardUrls.length > 0) {
        result += `🔗 <b>Ссылки для кнопок:</b>\n`;
        keyboardUrls.forEach((urlObj: any, index: number) => {
            // Проверяем, является ли это старым форматом (строка) или новым (объект)
            if (typeof urlObj === 'string') {
                result += `   ${index + 1}. <a href="${urlObj}">${urlObj}</a>\n`;
            } else {
                result += `   ${index + 1}. <b>${urlObj.text}</b> - <a href="${urlObj.link}">${urlObj.link}</a>\n`;
            }
        });
        result += `\n`;
    } else {
        result += `🔗 <b>Ссылки для кнопок:</b> ❌ Не указаны\n\n`;
    }

    result += `📊 <b>Статистика:</b>\n`;
    result += `   • Адресов кошельков: ${addresses.length}/${FORM_LIMITS.MAX_ADDRESSES}\n`;
    result += `   • Ссылок для кнопок: ${keyboardUrls.length}/${FORM_LIMITS.MAX_URLS}\n\n`;
    
    result += `💡 Нажмите кнопку ниже, чтобы изменить информацию.`;

    return {info: result, addressesText};
}
 

 
  encodeParams(payload: {}) {
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }



  escapeMarkdown(text: string): string {
    if (!text) return '';
    return text.replace(/[_*[\]()~`>#+=|{}.]/g, '\\$&');
  }

  formatUserLink(id: number | string, firstName: string, username?: string): string {

    const escapedUsername = this.escapeMarkdown(username)
    const userLink = username && typeof username === 'string'
      ? `[${firstName}](https://t.me/${escapedUsername})`
      : `[${firstName}](tg://user?id=${id})`;

    return `${userLink} (ID: \`${id}\`)`;
  }


  async getChatConfig() {
    return await this.usersService.findUsersConfig()
  }


  formatRegistrationDate(date: Date, language: string = 'ru'): string | null {
    if (!date) return null
    return date.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' })
  }

  testIsUsername(username: string): boolean {
    const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{3,31}$/;
    return USERNAME_REGEX.test(username.replace('@', ''));
  }

  testIsTelegramId(telegramId: string): boolean {
    return /^\d+$/.test(telegramId.toString());
  }
}