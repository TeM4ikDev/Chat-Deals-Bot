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
import { Language } from './decorators/language.decorator';
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
    private readonly localizationService: LocalizationService,

  ) { }

  private createScammersKeyboard(scammers: any[], query: string, page: number, maxPage: number, lang: string) {
    const keyboard = scammers.map((s) => {
      const username = s.username ? `@${s.username}` : this.localizationService.getT('userCheck.noUsername', lang);
      const label = `${username} | ${s.telegramId}`;
      return [{
        text: label,
        callback_data: `scammer_detail:${s.id}:${query}:${page}`,
      }];
    });

    const navigationRow = [];

    if (page > 1) {
      navigationRow.push({
        text: this.localizationService.getT('navigation.previous', lang),
        callback_data: `scammer_page:${query}:${page - 1}`,
      });
    }

    if (page < maxPage) {
      navigationRow.push({
        text: this.localizationService.getT('navigation.next', lang),
        callback_data: `scammer_page:${query}:${page + 1}`,
      });
    }

    if (navigationRow.length) {
      keyboard.push(navigationRow);
    }

    return keyboard;
  }

  private createScammersMessage(scammers: any[], page: number, maxPage: number, lang: string) {
    return this.localizationService.getT('userCheck.searchResults', lang)
      .replace('{count}', scammers.length.toString())
      .replace('{page}', page.toString())
      .replace('{maxPage}', maxPage.toString());
  }

  async sendUsersPage(ctx: Context, query: string, page: number, editMessageId?: number, lang: string = 'ru') {
    const limit = 10;
    const { scammers, pagination: { maxPage } } = await this.scamformService.getScammers(page, limit, query);
    const garants = await this.userService.findGarants();

    const exactGarantMatch = garants.find(g => g.username === query.replace('@', ''));
    if (exactGarantMatch) {
      const stream = fs.createReadStream(IMAGE_PATHS.GARANT);
      const text = this.localizationService.getT('userCheck.garantFound', lang).replace('{username}', exactGarantMatch.username);

      await ctx.replyWithPhoto({ source: stream }, { caption: text, parse_mode: 'Markdown' });
      return;
    }

    if (!scammers.length) {
      const stream = fs.createReadStream(IMAGE_PATHS.UNKNOWN);
      await ctx.replyWithPhoto({ source: stream }, {
        caption: this.localizationService.getT('userCheck.notFound', lang),
        parse_mode: 'Markdown'
      });
      return;
    }

    const keyboard = this.createScammersKeyboard(scammers, query, page, maxPage, lang);
    const messageText = this.createScammersMessage(scammers, page, maxPage, lang);

    if (editMessageId) {
      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          editMessageId,
          undefined,
          messageText,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: keyboard,
            },
          }
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes('there is no text in the message to edit')) {
          await ctx.telegram.deleteMessage(ctx.chat.id, editMessageId);
          await ctx.reply(
            messageText,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: keyboard,
              },
            }
          );
        } else {
          throw error;
        }
      }
    } else {
      await ctx.reply(
        messageText,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: keyboard,
          },
        }
      );
    }
  }

  @Action(/^scammer_page:(.+):(\d+)$/)
  async onScammerPage(@Ctx() ctx: Context, @Language() lang: string) {
    const [, query, pageStr] = (ctx as any).callbackQuery.data.match(/^scammer_page:(.+):(\d+)$/);
    const page = parseInt(pageStr);

    await ctx.answerCbQuery();
    
    const messageId = ctx.callbackQuery?.message?.message_id;
    await this.sendUsersPage(ctx, query, page, messageId, lang);
  }

  @On('message')
  async findUser(@Ctx() ctx: Context, @Language() lang: string) {
    const query = ctx.text?.trim();
    if (!query || query.split(' ').length > 1) return;

    await this.sendUsersPage(ctx, query, 1, undefined, lang);
  }

  @Action(/^scammer_detail:(.+):(.+):(\d+)$/)
  async onScammerDetail(@Ctx() ctx: Context, @Language() lang: string) {
    const data = (ctx.callbackQuery as any)?.data;
    const [, id, query, pageStr] = data.match(/^scammer_detail:(.+):(.+):(\d+)$/);
    const page = parseInt(pageStr);

    console.log(id)

    const scammer = await this.scamformService.findScammerById(id);
    if (!scammer) {
      return ctx.answerCbQuery(this.localizationService.getT('userCheck.userNotFound', lang), { show_alert: true });
    }

    const username = scammer.username ? `@${scammer.username}` : this.localizationService.getT('userCheck.noUsername', lang);
    const telegramId = scammer.telegramId;
    const formsCount = scammer.scamForms.length;
    const link = `https://t.me/svdbasebot/scamforms?startapp=${scammer.username || scammer.telegramId}`;

    const photoStream = fs.createReadStream(IMAGE_PATHS[scammer.status]);

    const messageId = ctx.callbackQuery?.message?.message_id;
    
    if (messageId) {
      await ctx.telegram.editMessageMedia(
        ctx.chat.id,
        messageId,
        undefined,
        {
          type: 'photo',
          media: { source: photoStream },
          caption: this.localizationService.getT('userCheck.userDetails', lang)
            .replace('{username}', username)
            .replace('{telegramId}', telegramId)
            .replace('{status}', scammer.status)
            .replace('{formsCount}', formsCount.toString())
            .replace('{link}', link),
          parse_mode: 'Markdown',
        },
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: this.localizationService.getT('navigation.backToList', lang),
                  callback_data: `back_to_list:${query}:${page}`,
                }
              ]
            ],
          },
        }
      );
    } else {
      // Если нет ID сообщения, отправляем новое
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
              [
                {
                  text: this.localizationService.getT('navigation.backToList', lang),
                  callback_data: `back_to_list:${query}:${page}`,
                }
              ]
            ],
          },
        }
      );
    }

    await ctx.answerCbQuery();
  }

  @Action(/^back_to_list:(.+):(\d+)$/)
  async onBackToList(@Ctx() ctx: Context, @Language() lang: string) {
    const data = (ctx.callbackQuery as any)?.data;
    const [, query, pageStr] = data.match(/^back_to_list:(.+):(\d+)$/);
    const page = parseInt(pageStr);

    await ctx.answerCbQuery();
    
    // Получаем ID сообщения для редактирования
    const messageId = ctx.callbackQuery?.message?.message_id;
    await this.sendUsersPage(ctx, query, page, messageId, lang);
  }


  // ___________

  @Action(/^like_complaint:(.+)$/)
  async onLikeComplaint(@Ctx() ctx: Context, @Language() lang: string) {
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
  async onDislikeComplaint(@Ctx() ctx: Context, @Language() lang: string) {
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
                text: this.localizationService.getT('voting.like', lang).replace('{count}', likes.toString()),
                callback_data: `like_complaint:${scamFormId}`,
              },
              {
                text: this.localizationService.getT('voting.dislike', lang).replace('{count}', dislikes.toString()),
                callback_data: `dislike_complaint:${scamFormId}`,
              },
            ],
          ],
        }
      );
    }
  }
}


