import { DatabaseService } from '@/database/database.service';
import { UsersService } from '@/users/users.service';
import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Input, Telegraf } from 'telegraf';
import { InlineQueryResult, InputFile } from 'telegraf/typings/core/types/typegram';

@Injectable()
export class TelegramService implements OnModuleInit {
  constructor(
    @InjectBot() private readonly bot: Telegraf,
    @Inject('DEFAULT_BOT_NAME') private readonly botName: string,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly database: DatabaseService,
    private readonly configService: ConfigService
  ) { }

  getPhotoStream(filePath: string): InputFile {
    return Input.fromLocalFile(filePath)
  }

  async sendMessage(telegramId: string, message: string) {
    return await this.bot.telegram.sendMessage(telegramId, message)
  }



  isUserHasAccept(telegramId: string, arrAccepted: string[]): boolean {
    return arrAccepted.includes(telegramId)
  }

  onModuleInit() {
    // Регистрируем обработчик inline-запросов
    this.bot.on('inline_query', async (ctx) => {
      await this.handleInlineQuery(ctx);
    });
  }

  private async handleInlineQuery(ctx: any) {
    const query = ctx.inlineQuery.query.trim().replace(/^@/, '');
    
    // Если запрос пустой, показываем инструкцию
    if (!query) {
      const results: InlineQueryResult[] = [
        {
          type: 'article',
          id: 'instruction',
          title: 'Введите @username для поиска',
          input_message_content: {
            message_text: '🔍 Введите @username пользователя для поиска',
          },
          description: 'Начните вводить username пользователя',
        },
      ];
      await ctx.answerInlineQuery(results);
      return;
    }

    // Ищем пользователей по username
    const searchResult = await this.usersService.findAllUsers(1, 10, query);
    const users = searchResult.users;

    const results: InlineQueryResult[] = [];

    if (users.length === 0) {
      results.push({
        type: 'article',
        id: 'not_found',
        title: 'Пользователь не найден',
        input_message_content: {
          message_text: `❌ Пользователь с username "${query}" не найден в базе данных`,
        },
        description: 'Попробуйте другой username',
      });
    } else {
      users.forEach((user, index) => {
        const displayName = user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`
          : user.firstName || user.lastName || 'Без имени';
        
        const roleText = user.role === 'ADMIN' ? '👑 Админ' : 
                        user.role === 'SUPER_ADMIN' ? '👑 Супер админ' : '👤 Пользователь';

        results.push({
          type: 'article',
          id: `user_${user.id}`,
          title: `@${user.username}`,
          input_message_content: {
            message_text: `👤 **Пользователь найден**\n\n` +
                         `**Username:** @${user.username}\n` +
                         `**Имя:** ${displayName}\n` +
                         `**Роль:** ${roleText}\n` +
                         `**Telegram ID:** ${user.telegramId}\n\n` +
                         `_Найден через inline-поиск бота_`,
            parse_mode: 'Markdown',
          },
          description: `${displayName} • ${roleText}`,
        });
      });
    }

    await ctx.answerInlineQuery(results);
  }
}