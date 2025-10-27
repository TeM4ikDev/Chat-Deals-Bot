import { AdminService } from '@/admin/admin.service';
import { UsersService } from '@/users/users.service';
import { ConfigService } from '@nestjs/config';
import { UserRoles} from '@prisma/client';
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
  ) { }

 
  // _____________________________
}