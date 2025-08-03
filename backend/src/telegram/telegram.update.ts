import { UserCheckMiddleware } from '@/auth/strategies/telegram.strategy';
import { ScamformService } from '@/scamform/scamform.service';
import { UsersService } from '@/users/users.service';
import { UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VoteType } from '@prisma/client';
import { Action, Ctx, On, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { IMAGE_PATH } from './constants/telegram.constants';
import { TelegramService } from './telegram.service';

@UseGuards(UserCheckMiddleware)
@Update()
export class TelegramUpdate {
  protected image: any;

  constructor(
    protected readonly telegramService: TelegramService,
    protected readonly configService: ConfigService,
    protected readonly userService: UsersService,
    private readonly scamformService: ScamformService,

  ) {
    this.image = this.telegramService.getPhotoStream(IMAGE_PATH);
  }

  @On('message')
  async msg(@Ctx() ctx: Context) {
    if (ctx.text.split(' ').length > 0) return

    const scammers = await this.scamformService.getScammers(ctx.text);

    if (!scammers.length) {
      await ctx.reply(
        '🔍 Пользователь не найден в базе мошенников.\n\n' +
        '⚠️ Помните: даже если пользователь отсутствует в базе, это **не гарантирует** его надежность.\n\n' +
        '✅ Рекомендуем проводить сделки только через проверенного гаранта.\n\n' +
        'Гаранты - /garants\n\n' +
        '📁 *Полезные ссылки:*\n' +
        '╟ [Каталог](https://t.me/nftcatalog)\n' +
        '╟ [Теги](https://t.me/svdteg)\n' +
        '╟ [Добавить бота в группу](https://t.me/svdbasebot?startgroup=true)\n' +
        '╟ [Все проекты](https://t.me/giftthread)',
        { parse_mode: 'Markdown' }
      );
      return;
    }


    const list = scammers
      .map((s, i) => {
        const isLast = i === scammers.length - 1;
        const prefix = isLast ? '└' : '├';
        const username = s.username ? `@${s.username}` : '( -- )';
        return `${prefix} ${username} | ${s.telegramId} [жалобы(${s.count})](https://t.me/svdbasebot/scamforms?startapp=${s.username || s.telegramId})`;
      })
      .join('\n');

    await ctx.reply(`🔍 Найденные мошенники:\n${list}`, { parse_mode: 'Markdown' });
  }



  @Action(/^like_complaint:(.+)$/)
  async onLikeComplaint(@Ctx() ctx: Context) {
    const user = ctx.from;
    const callbackData = (ctx.callbackQuery as any)?.data;
    const scamFormId = callbackData.split(':')[1];

    const { message, isSuccess, likes, dislikes } = await this.scamformService.voteUser(
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

    const { message, isSuccess, likes, dislikes } = await this.scamformService.voteUser(
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


