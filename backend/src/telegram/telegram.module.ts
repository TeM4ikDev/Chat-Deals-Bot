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
import { BusinessModeUpdate, BusinessMessageUpdate } from './updates/businessMode.update';
import { ChatCommandsUpdate } from './updates/chatCommands.update';
import { GarantsUpdate } from './updates/garants.update';
import { LanguageUpdate } from './updates/language.update';
import { MainMenuUpdate } from './updates/main-menu.update';
import { PollingService } from './services/polling.service';
import { DatabaseService } from '@/database/database.service';
import { InlineQueryUpdate } from './updates/InlineQuery.update';

@Module({

  imports: [
    ConfigModule,
    DatabaseModule,
    JwtModule,
    forwardRef(() => AdminModule),
    forwardRef(() => ScamformModule),
    forwardRef(() => UsersModule),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule, forwardRef(() => UsersModule)],
      useFactory: (configService: ConfigService, usersService: UsersService) => ({
        token: configService.get<string>('BOT_TOKEN'),
        middlewares: [session()
          
        ],
        launchOptions: {
          allowedUpdates: [
            'message',
            'chat_member',
            'my_chat_member',
            'chat_join_request',
            'callback_query',
            'inline_query',
            'business_message' as any,
            'edited_business_message',
            'deleted_business_message',
            'sender_business_bot',
            'business_connection'

          ],
          dropPendingUpdates: true,
        },

      }),
      inject: [ConfigService, UsersService ],
    }),

  ],
  providers: [
    LanguageUpdate,
    MainMenuUpdate,
    GarantsUpdate,
    LocalizationService,
    ScammerFrom,
    AppealForm,

    PollingService,


   
    
    BusinessMessageUpdate,
    BusinessModeUpdate,

    ChatCommandsUpdate,
    TelegramService,
    TelegramUpdate,
    InlineQueryUpdate,


  ],
  exports: [TelegramService, LocalizationService, BusinessModeUpdate, BusinessMessageUpdate]
})
export class TelegramModule { }
