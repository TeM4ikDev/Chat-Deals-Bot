import { UserCheckMiddleware } from '@/auth/strategies/telegram.strategy';
import { ScamformService } from '@/scamform/scamform.service';
import { UsersService } from '@/users/users.service';
import { UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VoteType } from '@prisma/client';
import * as fs from 'fs';
import { Action, Ctx, On, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { IMAGE_PATHS } from './constants/telegram.constants';
import { LocalizationService } from './services/localization.service';
import { TelegramService } from './telegram.service';

@UseGuards(UserCheckMiddleware)
@Update()
export class TelegramUpdate {
  constructor(
    protected readonly telegramService: TelegramService,
    protected readonly configService: ConfigService,
    protected readonly userService: UsersService,
    private readonly scamformService: ScamformService,
    private readonly localizationService: LocalizationService

  ) { }

  @On('message')
  async msg(@Ctx() ctx: Context) {
    if (ctx.text.split(' ').length > 1) return

    const { scammers } = await this.scamformService.getScammers(1, 20, ctx.text);
    const garants = await this.userService.findGarants()

    const exactGarantMatch = garants.find(garant =>
      garant.username === ctx.text.replace('@', '')
    );

    if (exactGarantMatch) {
      const photoStream = fs.createReadStream(IMAGE_PATHS.GARANT);
      const garantInfo = this.localizationService.getT('userCheck.garantFound', 'ru').replace('{username}', exactGarantMatch.username);

      await ctx.replyWithPhoto(
        { source: photoStream },
        {
          caption: garantInfo,
          parse_mode: 'Markdown'
        }
      );
      return;
    }

    if (!scammers.length) {
      const photoStream = fs.createReadStream(IMAGE_PATHS.NO_INFO);
      await ctx.replyWithPhoto(
        { source: photoStream },
        {
          caption: this.localizationService.getT('userCheck.notFound', 'ru'),
          parse_mode: 'Markdown'
        }
      );
      return;
    }

    const list = scammers
      .map((s, i) => {
        const isLast = i === scammers.length - 1;
        const template = isLast ? this.localizationService.getT('userCheck.listItem.last', 'ru') : this.localizationService.getT('userCheck.listItem.notLast', 'ru');
        const username = s.username ? `@${s.username}` : '( -- )';
        const identifier = s.username || s.telegramId;

        return template
          .replace('{username}', username)
          .replace('{telegramId}', s.telegramId)
          .replace('{count}', s.scamForms.toString())
          .replace('{identifier}', identifier);
      })
      .join('\n');

    const photoStream = fs.createReadStream(IMAGE_PATHS.SCAMMER);
    await ctx.replyWithPhoto(
      { source: photoStream },
      {
        caption: this.localizationService.getT('userCheck.found', 'ru').replace('{list}', list),
        parse_mode: 'Markdown'
      }
    );
  }

  @Action(/^like_complaint:(.+)$/)
  async onLikeComplaint(@Ctx() ctx: Context) {
    const user = ctx.from;
    const callbackData = (ctx.callbackQuery as any)?.data;
    const scamFormId = callbackData.split(':')[1];

    const { message, isSuccess, likes, dislikes, userVote } = await this.scamformService.voteUser(
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
  async onDislikeComplaint(@Ctx() ctx: Context) {
    const user = ctx.from;
    const callbackData = (ctx.callbackQuery as any)?.data;
    const scamFormId = callbackData.split(':')[1];

    const { message, isSuccess, likes, dislikes, userVote } = await this.scamformService.voteUser(
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
                callback_data: `like_complaint:${scamFormId}`,
              },
              {
                text: `👎 ${dislikes}`,
                callback_data: `dislike_complaint:${scamFormId}`,
              },
            ],
          ],
        }
      );
    }
  }
}


