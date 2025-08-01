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

import { ScamformModule } from '@/scamform/scamform.module';
import { ScammerFrom } from './scenes/scammer_form.scene';
import { GarantsUpdate } from './updates/garants.update';
import { LanguageUpdate } from './updates/language.update';
import { MainMenuUpdate } from './updates/main-menu.update';

@Module({

  imports: [
    ConfigModule,
    DatabaseModule,
    JwtModule,
    forwardRef(() => ScamformModule),
    forwardRef(() => UsersModule),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule, forwardRef(() => UsersModule)],
      useFactory: (configService: ConfigService, usersService: UsersService) => ({
        token: configService.get<string>('BOT_TOKEN'),
        middlewares: [
          session()
        ],
      }),
      inject: [ConfigService, UsersService],
    }),
  ],
  providers: [
    TelegramService,
    LanguageUpdate,
    MainMenuUpdate,
    GarantsUpdate,
    LocalizationService,
    ScammerFrom
  ],
  exports: [TelegramService, LocalizationService]
})
export class TelegramModule { }
