import { AdminService } from '@/admin/admin.service';
import { ScamformService } from '@/scamform/scamform.service';
import { UsersService } from '@/users/users.service';
import { ConfigService } from '@nestjs/config';
import { UserRoles, VoteType } from '@prisma/client';
import { Action, Command, Ctx, On, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { User } from 'telegraf/typings/core/types/typegram';
import { Language } from './decorators/language.decorator';
import { LocalizationService } from './services/localization.service';
import { TelegramService } from './telegram.service';
import { SCENES } from './constants/telegram.constants';
import { SceneContext } from 'telegraf/typings/scenes';

// @UseGuards(UserCheckMiddleware)
@Update()
export class TelegramUpdate {
  constructor(
    protected readonly telegramService: TelegramService,
    protected readonly configService: ConfigService,
    protected readonly userService: UsersService,
    private readonly scamformService: ScamformService,
  ) { }

  @On('chat_member')
  async onChatMember(@Ctx() ctx: Context) {
    console.log('onChatMember')
    const chatMember = (ctx as any).update.chat_member;
    const newMember: User = chatMember.new_chat_member.user;
    const oldStatus = chatMember.old_chat_member.status;
    const newStatus = chatMember.new_chat_member.status;

    if (oldStatus === 'left' && newStatus === 'member' && !newMember.is_bot) {
      await this.telegramService.sendNewUserMessage(ctx, newMember)
    }
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