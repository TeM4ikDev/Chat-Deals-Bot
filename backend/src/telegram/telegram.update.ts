import { UserCheckMiddleware } from '@/auth/strategies/telegram.strategy';
import { ScamformService } from '@/scamform/scamform.service';
import { UsersService } from '@/users/users.service';
import { UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, VoteType } from '@prisma/client';
import * as fs from 'fs';
import { Action, Ctx, On, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
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

  ) { }


  @On('message')
  async findUser(@Ctx() ctx: Context, @Language() lang: string) {
    const message = ctx.text?.trim();
    if (!message) return;

    // Проверяем ответ на сообщение с командами
    if ('reply_to_message' in ctx.message && ctx.message.reply_to_message) {
      const repliedMessage = ctx.message.reply_to_message;
      const user = repliedMessage.from;
      if (!user) return;

      const query = user.username || user.id.toString();

      if (message.toLowerCase() === 'чек') {
        console.log('Проверка пользователя из ответа:', query);
        await this.checkUserAndSendInfo(ctx, query, lang);
        return;
      }

      if (message.toLowerCase() === 'сколько см') {
        console.log('Запрос количества см для пользователя:', query);
        await this.handleScammerCount(ctx, query, lang);
        return;
      }
    }

    const words = message.split(' ');
    const command = words[0].toLowerCase();

    switch (command) {
      case 'чек':
        await this.handleCheckCommand(ctx, words, lang);
        break;

      default:
        if (ctx.message.chat.type === 'private') {
          await this.handleDirectSearch(ctx, message, lang);
        }
        break;
    }
  }

  private async checkUserAndSendInfo(ctx: Context, query: string, lang: string) {
    const isGarant = await this.checkAndSendGarantInfo(ctx, query, lang);
    if (isGarant) {
      return;
    }

    const scammer = await this.scamformService.getScammerByQuery(query);
    await this.onScammerDetail(ctx, lang, scammer, query);
  }

  private async checkAndSendGarantInfo(ctx: Context, query: string, lang: string): Promise<boolean> {
    const garants = await this.userService.findGarants();
    const isGarant = garants.some(garant =>
      garant.username?.toLowerCase() === query.toLowerCase()
    );

    if (isGarant) {
      const photoStream = fs.createReadStream(IMAGE_PATHS.GARANT);
      await ctx.replyWithPhoto(
        { source: photoStream },
        {
          caption: this.localizationService.getT('userCheck.garantUser', lang)
            .replace('{username}', query),
          parse_mode: 'Markdown',
        }
      );
      return true;
    }

    return false;
  }

  private async handleCheckCommand(ctx: Context, words: string[], lang: string) {
    if (words.length < 2) {
      return;
    }

    const query = words.slice(1).join(' ').trim().replace('@', '');
    console.log('Поиск пользователя:', query);

    await this.checkUserAndSendInfo(ctx, query, lang);
  }

  private async handleDirectSearch(ctx: Context, message: string, lang: string) {
    const query = message.trim().replace('@', '');

    await this.checkUserAndSendInfo(ctx, query, lang);
  }

  private async handleScammerCount(ctx: Context, query: string, lang: string) {
    // const scammer = await this.scamformService.getScammerByQuery(query);

    // if (!scammer) {
    //   await ctx.reply(`@${query} - 0 см`);
    //   return;
    // }

    // const formsCount = scammer.scamForms.length;
    await ctx.reply(`У @${query} - ${Math.floor(-10 + Math.random() * (30 + 10))
      } см`);
  }

  async onScammerDetail(
    @Ctx() ctx: Context,
    lang: string,
    scammer: Prisma.ScammerGetPayload<{ include: { scamForms: true } }> | null,
    query: string
  ) {
    if (!scammer) {
      const photoStream = fs.createReadStream(IMAGE_PATHS.UNKNOWN);
      await ctx.replyWithPhoto(
        { source: photoStream },
        {
          caption: this.localizationService.getT('userCheck.userNotFound', lang).replace('{userinfo}', query) ,
          parse_mode: 'Markdown',

        }
      );
      return;
    }

    const username = scammer.username ? `@${scammer.username}` : this.localizationService.getT('userCheck.noUsername', lang);
    const telegramId = scammer.telegramId || '--';
    const formsCount = scammer.scamForms.length;
    const link = `https://t.me/svdbasebot/scamforms?startapp=${scammer.username || scammer.telegramId}`;
    const photoStream = fs.createReadStream(IMAGE_PATHS[scammer.status]);


    await ctx.replyWithPhoto(
      { source: photoStream },
      {
        caption: this.localizationService.getT('userCheck.userDetails', lang)
          .replace('{username}', username)
          .replace('{telegramId}', telegramId)
          .replace('{status}', scammer.status)
          .replace('{formsCount}', formsCount.toString())
          .replace('{link}', link),
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{
              text: `👍 ${scammer.likes}`,
              callback_data: `like_user:${scammer.id}`
            },
            {
              text: `👎 ${scammer.dislikes}`,
              callback_data: `dislike_user:${scammer.id}`
            }]
          ]
        }
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
}


