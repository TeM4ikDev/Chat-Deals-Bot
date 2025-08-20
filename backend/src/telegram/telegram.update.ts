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


  @On('new_chat_members')
  async handleNewChatMembers(@Ctx() ctx: Context) {
    const m: User | undefined = (ctx.message as any)?.new_chat_members?.[0];
    if (!m || m.is_bot) return;

    const userLink = m.username
      ? `[${m.first_name}](https://t.me/${m.username})`
      : `[${m.first_name}](tg://user?id=${m.id})`;

    await ctx.reply(
      `Привет, ${userLink}! Добро пожаловать в чат 🎉\n\n` +
      `Пожалуйста, ознакомься с [правилами чата](https://t.me/giftthread/54171)`,
      { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } },
    );
  }

  @On('chat_member')
  async onChatMember(@Ctx() ctx: Context) {
    console.log('onChatMember')
    const chatMember = (ctx as any).update.chat_member;
    const newMember: User = chatMember.new_chat_member.user;
    const oldStatus = chatMember.old_chat_member.status;
    const newStatus = chatMember.new_chat_member.status;

    const scammer = await this.scamformService.findOrCreateScammer({ id: newMember.id.toString(), username: newMember.username })

    if (oldStatus === 'left' && newStatus === 'member') {
      const userLink = newMember.username
        ? `[${newMember.first_name}](https://t.me/${newMember.username})`
        : `[${newMember.first_name}](tg://user?id=${newMember.id})`;

        await ctx.reply(
          `👋 Привет, ${userLink}!\n` +
          `🎉 Добро пожаловать в чат!\n\n` +
          `• Статус: \`${scammer.status}\`\n` +
          `• Количество жалоб: \`${scammer.scamForms.length || 0}\`\n\n` +
          `📖 Пожалуйста, ознакомься с [правилами чата](https://t.me/giftthread/54171)`,
          {
            parse_mode: 'Markdown',
            link_preview_options: { is_disabled: true },
          },
        );
        
    }

    // if(scammer.status == ScammerStatus.SCAMMER){
    //   await this.telegramService.banScammerFromGroup(scammer)
    // }
  }


  // ____________________






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


