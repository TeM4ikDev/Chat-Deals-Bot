import { AdminService } from '@/admin/admin.service';
import { ScamformService } from '@/scamform/scamform.service';
import { IUser } from '@/types/types';
import { UsersService } from '@/users/users.service';
import { ConfigService } from '@nestjs/config';
import { Prisma, ScammerStatus, UserRoles, VoteType } from '@prisma/client';
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

    private readonly adminService: AdminService,

  ) { }

  @On('message')
  async findUser(@Ctx() ctx: Context, @Language() lang: string) {
    const message = ctx.text?.trim().replace('@', '');
    if (!message) return;

    const words = message.split(/\s+/).filter(word => word.length > 0);
    const command = words[0].toLowerCase();

    const commandData = words.slice(2).join(' ');


    if ('reply_to_message' in ctx.message && ctx.message.reply_to_message) {
      const repliedMessage = ctx.message.reply_to_message;
      const user = repliedMessage.from;
      if (!user) return;

      const msg = message.toLowerCase().replace('@', '');

      const telegramId = user.username || user.id.toString();
      const word = msg.split(' ')[1];

      const { user: repliedUser } = await this.userService.findOrCreateUser(user);

      console.log(repliedUser)

      switch (msg) {
        case 'чек':
          await this.checkUserAndSendInfo(ctx, telegramId, lang);
          return; // Добавляем return чтобы прервать выполнение

        case '+адм':
          if (!await this.guardCommandRoles([UserRoles.SUPER_ADMIN], repliedUser, ctx)) return
          await this.handleAdmin(ctx, repliedUser, true);
          break;

        case '-адм':
          if (!await this.guardCommandRoles([UserRoles.SUPER_ADMIN], repliedUser, ctx)) return
          await this.handleAdmin(ctx, repliedUser, false);
          break;
      }
      await this.handlePrefixCommands(ctx, msg, repliedUser, word);
      return; // Добавляем return чтобы прервать выполнение для всех reply команд
    }

    switch (command) {
      case 'чек':
        await this.handleCheckCommand(ctx, words[1], lang);
        break;

      case 'инфо':
        await this.handleDescriptionCommand(ctx, words[1], commandData, lang);
        break;
    }
  }

  private async handlePrefixCommands(ctx: Context, message: string, repliedUser: IUser, word: string) {
    if (message.startsWith('статус')) {
      await this.handleStatus(ctx, repliedUser, word);
      return;
    }
  }

  private async guardCommandRoles(roles: UserRoles[], repliedUser: IUser, adminAddCtx: Context) {

    const admin = await this.userService.findUserByTelegramId(adminAddCtx.from.id.toString());


    console.log('admin', admin)

    if (!repliedUser) {
      adminAddCtx.reply('Пользователя нет в боте. Ему нужно сначала зайти в бота.', {
        reply_markup: {
          inline_keyboard: [
            [{
              text: 'Зайти в бота',
              url: 'https://t.me/svdbasebot'
            }]
          ]
        }
      });
      return false;
    }

    if (repliedUser.role === UserRoles.SUPER_ADMIN) {
      adminAddCtx.reply('Пользователь уже супер админ');
      return false
    }

    if (roles.includes(admin.role)) {
      return true;
    }

    await adminAddCtx.reply('У вас нет доступа к этой команде');
    return false;

  }

  private async handleAdmin(ctx: Context, user: IUser, isAdd: boolean) {
    await this.userService.updateUserRole(user.telegramId, isAdd ? UserRoles.ADMIN : UserRoles.USER)
    ctx.reply(`Пользователь (@${user.username}) ${isAdd ? 'теперь' : 'больше не'} админ`)
  }

  private async checkUserAndSendInfo(ctx: Context, query: string, lang: string) {
    const isGarant = await this.checkAndSendGarantInfo(ctx, query, lang);
    if (isGarant) return

    const scammer = await this.scamformService.getScammerByQuery(query);
    console.log(scammer)

    await this.onScammerDetail(ctx, lang, scammer, query);
  }

  private async checkAndSendGarantInfo(ctx: Context, query: string, lang: string): Promise<boolean> {
    if (await this.checkIsGarant(query)) {
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

  private async handleDescriptionCommand(ctx: Context, query: string, commandData: string, lang: string) {

    const description = commandData

    console.log('description', description)
    console.log('query', query)

    if (!query) {
      await ctx.reply('Пожалуйста, укажите имя пользователя. Пример: инфо @username');
      return;
    }

    const scammer = await this.scamformService.getScammerByQuery(query);

    if (!scammer) {
      await ctx.reply('Пользователь не найден');
      return;
    }

    if (!description) {
      await ctx.reply(`📝 **Текущее описание** @${query}:\n\n\`\`\`\n${scammer.description || 'Описание отсутствует'}\n\`\`\`\n💡 Для изменения используйте:\n\`инфо @${query} новое описание\``, {
        parse_mode: 'Markdown'
      })
      return;
    }

    await this.scamformService.updateScammer(scammer.id, { description })
    await ctx.reply(`Описание пользователя (@${scammer.username}) обновлено`)
  }

  private async handleCheckCommand(ctx: Context, query: string, lang: string) {
    console.log('Поиск пользователя:', query);
    await this.checkUserAndSendInfo(ctx, query, lang);
  }

  private async handleDirectSearch(ctx: Context, message: string, lang: string) {
    const query = message.trim().replace('@', '');

    await this.checkUserAndSendInfo(ctx, query, lang);
  }

  private async checkIsGarant(username: string): Promise<boolean> {
    const garants = await this.userService.findGarants();

    if (!username) return

    return garants.some(garant =>
      garant.username?.toLowerCase() === username.toLowerCase()
    );
  }

  private async handleStatus(ctx: Context, repliedUser: IUser, statusText: string) {
    let status: ScammerStatus;
    const user = await this.scamformService.getScammerByTelegramId(repliedUser.telegramId);

    if (await this.checkIsGarant(repliedUser.username)) {
      await ctx.reply('Это гарант. Вы не можете изменить его статус');
      return;
    }

    if (!statusText) {
      await ctx.reply(`${user ? `Статус @${user?.username} ${user.status}` : 'Пользователь не найден'}.\n\nЧтобы задать статус, выберите из списка: скам, неизв, подозр`);
      return;
    }

    switch (statusText) {
      case 'скам':
        status = ScammerStatus.SCAMMER;
        break;

      case 'неизв':
        status = ScammerStatus.UNKNOWN;
        break;

      case 'подозр':
        status = ScammerStatus.SUSPICIOUS;
        break;
    }

    const result = await this.scamformService.updateScammerStatus({
      scammerId: repliedUser.id,
      status,
      formId: undefined
    }, repliedUser);

    if (result.isSuccess && result.scammer) {
      await ctx.reply(`Статус пользователя (@${result.scammer.username || repliedUser.username}) изменен на ${result.scammer.status}`);
    }
    else {
      await ctx.reply(`Ошибка при обновлении статуса: ${result.message}`);
    }
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
          caption: this.localizationService.getT('userCheck.userNotFound', lang).replace('{userinfo}', this.telegramService.escapeMarkdown(query)),
          parse_mode: 'Markdown',

        }
      );
      return;
    }

    const username = scammer.username ? `@${scammer.username}` : this.localizationService.getT('userCheck.noUsername', lang);
    const telegramId = scammer.telegramId || '--';
    const formsCount = scammer.scamForms.length;
    let status = scammer.status
    const link = `https://t.me/svdbasebot/scamforms?startapp=${scammer.username || scammer.telegramId}`;
    let photoStream = fs.createReadStream(IMAGE_PATHS[status]);


    if (scammer.username.replace('@', '') == 'TeM4ik20') {
      photoStream = fs.createReadStream(IMAGE_PATHS.OGUREC);
      status = 'DIKIJ OGUREC' as ScammerStatus
    }

    const escapedUsername = this.telegramService.escapeMarkdown(username);

    await ctx.replyWithPhoto(
      { source: photoStream },
      {
        caption: this.localizationService.getT('userCheck.userDetails', lang)
          .replace('{username}', username)
          .replace('{telegramId}', telegramId)
          .replace('{status}', status)
          .replace('{formsCount}', formsCount.toString())
          .replace('{description}', scammer.description || 'нет описания')
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


