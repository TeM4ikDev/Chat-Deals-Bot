import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { UserId } from '@/decorators/userid.decorator';
import { TelegramService } from '@/telegram/telegram.service';
import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';

export interface IUpdateUserData {
  successfulDeals: number;
}

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly telegramService: TelegramService,
  ) { }

}
