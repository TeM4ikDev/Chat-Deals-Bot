import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { TelegramModule } from '../telegram/telegram.module';
import { BybitService } from './bybit.service';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [ConfigModule, DatabaseModule, TelegramModule, UsersModule],
  providers: [BybitService],
  exports: [BybitService],
})
export class BybitModule {}

