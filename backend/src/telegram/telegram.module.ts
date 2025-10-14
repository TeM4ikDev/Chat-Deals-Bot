import { AdminModule } from '@/admin/admin.module';
import { DatabaseModule } from '@/database/database.module';
import { ScamformModule } from '@/scamform/scamform.module';
import { UsersModule } from '@/users/users.module';
import { UsersService } from '@/users/users.service';
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TelegrafModule } from 'nestjs-telegraf';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { session } from 'telegraf';
import { AppealForm } from './scenes/appeal_form.scene';
import { BotNewsScene } from './scenes/bot_news.scene';
import { ScammerFrom } from './scenes/scammer_form.scene';
import { LocalizationService } from './services/localization.service';
import { PollingService } from './services/polling.service';
import { TelegramService } from './telegram.service';
import { TelegramUpdate } from './telegram.update';
import { BusinessMemesActions, BusinessMessageUpdate, BusinessModeUpdate } from './updates/businessMode.update';
import { ChatCommandsUpdate } from './updates/chatCommands.update';
import { GarantsUpdate } from './updates/garants.update';
import { InlineQueryUpdate } from './updates/InlineQuery.update';
import { LanguageUpdate } from './updates/language.update';
import { MainMenuUpdate } from './updates/main-menu.update';
import { TelegramClient } from './updates/TelegramClient';

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
      useFactory: (configService: ConfigService, usersService: UsersService) => {
        // const proxyUrl = configService.get<string>('PROXY_URL');
        // let agent = undefined;
        
        // if (proxyUrl) {
        //   agent = new SocksProxyAgent(proxyUrl, {
           
        //   });
        // }

        return {
          token: configService.get<string>('BOT_TOKEN'),
          middlewares: [session()],
          // telegram: {
          //   agent: agent,
          // },
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
        };
      },
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
    BotNewsScene,

    PollingService,

    TelegramClient,
    BusinessMessageUpdate,
    BusinessModeUpdate,
    BusinessMemesActions,

    ChatCommandsUpdate,
    TelegramService,
    TelegramUpdate,
    InlineQueryUpdate,


  ],
  exports: [TelegramService, LocalizationService, BusinessModeUpdate, BusinessMessageUpdate, TelegramClient]
})
export class TelegramModule { }
