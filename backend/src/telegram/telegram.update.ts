import { AdminService } from '@/admin/admin.service';
import { ScamformService } from '@/scamform/scamform.service';
import { IUser } from '@/types/types';
import { UsersService } from '@/users/users.service';
import { ConfigService } from '@nestjs/config';
import { Prisma, ScammerStatus, UserRoles, VoteType } from '@prisma/client';
import { Action, Ctx, On, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { User } from 'telegraf/typings/core/types/typegram';
import { IMAGE_PATHS } from './constants/telegram.constants';
import { Language } from './decorators/language.decorator';
import { LocalizationService } from './services/localization.service';
import { TelegramService } from './telegram.service';

// @UseGuards(UserCheckMiddleware)
@Update()
export class TelegramUpdate {
  constructor(
    protected readonly telegramService: TelegramService,
    protected readonly configService: ConfigService,
    protected readonly userService: UsersService,
    private readonly scamformService: ScamformService,
    private readonly localizationService: LocalizationService,

    private readonly adminService: AdminService,

  ) { }


  // @On('new_chat_members')
  // async handleNewChatMembers(@Ctx() ctx: Context) {
  //   const user: User | undefined = (ctx.message as any)?.new_chat_members?.[0];
  //   if (!user || user.is_bot) return;

  //   await this.sendNewUserMessage(ctx, user)
  // }

  @On('chat_member')
  async onChatMember(@Ctx() ctx: Context) {
    console.log('onChatMember')
    const chatMember = (ctx as any).update.chat_member;
    const newMember: User = chatMember.new_chat_member.user;
    const oldStatus = chatMember.old_chat_member.status;
    const newStatus = chatMember.new_chat_member.status;


    if (oldStatus === 'left' && newStatus === 'member' && !newMember.is_bot) {
      await this.sendNewUserMessage(ctx, newMember)
    }
  }


  private async sendNewUserMessage(ctx: Context, newMember: User) {
    console.log('sendNewUserMessage', ctx.chat)
    const chatUsername = (ctx as any).chat.username

    const message = await this.adminService.findMessageByChatUsername(chatUsername)
    if (!message) return
    console.log('message', message)
    const newUser = await this.scamformService.findOrCreateScammer({ id: newMember.id.toString(), username: newMember.username })

    const userLink = newMember.username
      ? `[${this.telegramService.escapeMarkdown(newMember.first_name)}](https://t.me/${newMember.username})`
      : `[${this.telegramService.escapeMarkdown(newMember.first_name)}](tg://user?id=${newMember.id})`;

    const userInfo = message.showNewUserInfo ?
      `• Статус: \`${newUser.status}\`\n` +
      `• Количество жалоб: \`${newUser.scamForms.length || 0}\`\n\n` : ''

    const userRulesLink = message.rulesTelegramLink ? `📖 Пожалуйста, ознакомься с [правилами чата](${message.rulesTelegramLink})\n\n` : ''

    await ctx.reply(
      `👋 Привет, ${userLink}!\n` +
      `🎉 Добро пожаловать в @${this.telegramService.escapeMarkdown(chatUsername)}!\n\n` +
      `${this.telegramService.escapeMarkdown(message.message || '')}\n\n` +
      userInfo +
      userRulesLink+
      "разработчик бота: @Tem4ik20"
      ,
      {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true }
      }
    );
  }

  // ___________

  @Action(/^like_complaint:(.+)$/)
  async onLikeComplaint(@Ctx() ctx: Context, @Language() lang: string) {
    const user = ctx.from;
    const callbackData = (ctx.callbackQuery as any)?.data;
    const scamFormId = callbackData.split(':')[1];

    const { message, isSuccess, likes, dislikes, userVote } = await this.scamformService.voteFormUser(
      user.id.toString(),
      scamFormId,
      VoteType.LIKE
    );

    await ctx.answerCbQuery(message);

    if (isSuccess && ctx.callbackQuery?.message) {
      await ctx.telegram.editMessageReplyMarkup(
        ctx.chat.id,
        ctx.callbackQuery.message.message_id,
        undefined,
        {
          inline_keyboard: [
            [
              {
                text: `👍 ${likes}`,
                callback_data: `like_complaint:${scamFormId}`
              },
              {
                text: `👎 ${dislikes}`,
                callback_data: `dislike_complaint:${scamFormId}`
              },
            ],
          ],
        }
      );
    }
  }

  @Action(/^dislike_complaint:(.+)$/)
  async onDislikeComplaint(@Ctx() ctx: Context, @Language() lang: string) {
    const user = ctx.from;
    const callbackData = (ctx.callbackQuery as any)?.data;
    const scamFormId = callbackData.split(':')[1];

    const { message, isSuccess, likes, dislikes, userVote } = await this.scamformService.voteFormUser(
      user.id.toString(),
      scamFormId,
      VoteType.DISLIKE
    );

    await ctx.answerCbQuery(message);

    if (isSuccess && ctx.callbackQuery?.message) {
      await ctx.telegram.editMessageReplyMarkup(
        ctx.chat.id,
        ctx.callbackQuery.message.message_id,
        undefined,
        {
          inline_keyboard: [
            [
              {
                text: `👍 ${likes}`,
                callback_data: `like_complaint:${scamFormId}`
              },
              {
                text: `👎 ${dislikes}`,
                callback_data: `dislike_complaint:${scamFormId}`
              },
            ],
          ],
        }
      );
    }
  }

  @Action(/^like_user:(.+)$/)
  async onLikeUser(@Ctx() ctx: Context, @Language() lang: string) {
    const user = ctx.from;
    const callbackData = (ctx.callbackQuery as any)?.data;
    const scammerId = callbackData.split(':')[1];

    const { message, isSuccess, likes, dislikes, userVote } = await this.scamformService.voteScammerUser(
      user.id.toString(),
      scammerId,
      VoteType.LIKE
    );

    await ctx.answerCbQuery(message);

    if (isSuccess && ctx.callbackQuery?.message) {
      await ctx.telegram.editMessageReplyMarkup(
        ctx.chat.id,
        ctx.callbackQuery.message.message_id,
        undefined,
        {
          inline_keyboard: [
            [
              {
                text: `👍 ${likes}`,
                callback_data: `like_user:${scammerId}`
              },
              {
                text: `👎 ${dislikes}`,
                callback_data: `dislike_user:${scammerId}`
              },
            ],
          ],
        }
      );
    }
  }

  @Action(/^dislike_user:(.+)$/)
  async onDislikeUser(@Ctx() ctx: Context, @Language() lang: string) {
    const user = ctx.from;
    const callbackData = (ctx.callbackQuery as any)?.data;
    const scammerId = callbackData.split(':')[1];

    const { message, isSuccess, likes, dislikes, userVote } = await this.scamformService.voteScammerUser(
      user.id.toString(),
      scammerId,
      VoteType.DISLIKE
    );

    await ctx.answerCbQuery(message);

    if (isSuccess && ctx.callbackQuery?.message) {
      await ctx.telegram.editMessageReplyMarkup(
        ctx.chat.id,
        ctx.callbackQuery.message.message_id,
        undefined,
        {
          inline_keyboard: [
            [
              {
                text: `👍 ${likes}`,
                callback_data: `like_user:${scammerId}`
              },
              {
                text: `👎 ${dislikes}`,
                callback_data: `dislike_user:${scammerId}`
              },
            ],
          ],
        }
      );
    }
  }

  // _____________________________




}


