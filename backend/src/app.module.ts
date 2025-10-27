import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { DatabaseService } from './database/database.service';

import { TelegramModule } from './telegram/telegram.module';
import { UsersModule } from './users/users.module';
import { UsersService } from './users/users.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    DatabaseModule,
    ScheduleModule.forRoot(),
    AuthModule,
    AdminModule,
    TelegramModule,
    UsersModule,


  ],
  controllers: [AppController],
  providers: [
    AppService,
  ],
  exports: [],
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly usersService: UsersService
  ) { }

  async onModuleInit() {
    // полная очистка базы данных
    // await this.cleanDatabase();
  }

  async cleanDatabase() {
    // await this.databaseService.scamForm.deleteMany();
    // await this.databaseService.media.deleteMany();
    // await this.databaseService.usersConfig.deleteMany();
    // await this.databaseService.user.deleteMany();
  }




}
