import { DatabaseModule } from '@/database/database.module';
import { UsersModule } from '@/users/users.module';
import { UsersService } from '@/users/users.service';
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';
import { LocalizationService } from './services/localization.service';
import { TelegramService } from './telegram.service';

import { AdminModule } from '@/admin/admin.module';
import { ScamformModule } from '@/scamform/scamform.module';
import { AppealForm } from './scenes/appeal_form.scene';
import { ScammerFrom } from './scenes/scammer_form.scene';
import { TelegramUpdate } from './telegram.update';
import { BusinessModeUpdate } from './updates/businessMode.update';
import { ChatCommandsUpdate } from './updates/chatCommands.update';
import { GarantsUpdate } from './updates/garants.update';
import { LanguageUpdate } from './updates/language.update';
import { MainMenuUpdate } from './updates/main-menu.update';

@Module({

  imports: [
    ConfigModule,
    DatabaseModule,
    forwardRef(() => AdminModule),
    JwtModule,
    forwardRef(() => ScamformModule),
    forwardRef(() => UsersModule),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule, forwardRef(() => UsersModule)],
      useFactory: (configService: ConfigService, usersService: UsersService) => ({
        token: configService.get<string>('BOT_TOKEN'),
        middlewares: [session()],
        launchOptions: {
          allowedUpdates: ['message', 'chat_member', 'my_chat_member', 'chat_join_request', 'callback_query', 'inline_query', 'business_message' as any],
          dropPendingUpdates: true,
        },
      }),
      inject: [ConfigService, UsersService],
    }),
    
  ],
  providers: [
    LanguageUpdate,
    MainMenuUpdate,
    GarantsUpdate,
    LocalizationService,
    ScammerFrom,
    AppealForm,
    TelegramService,
    TelegramUpdate,
    ChatCommandsUpdate,
    BusinessModeUpdate,
  ],
  exports: [TelegramService, LocalizationService, BusinessModeUpdate]
})
export class TelegramModule { }
