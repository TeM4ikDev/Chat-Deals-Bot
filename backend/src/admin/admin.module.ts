import { forwardRef, Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DatabaseModule } from '@/database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { TelegramModule } from '@/telegram/telegram.module';
import { UserManagementController } from './controllers/user.controller';
import { GarantsController } from './controllers/garants.controller';
import { ScamformModule } from '@/scamform/scamform.module';
import { ScamformController } from './controllers/scamforms.controller';

@Module({
  imports: [
    DatabaseModule,
    JwtModule,
    ScamformModule,
    forwardRef(() => UsersModule),
    forwardRef(() => TelegramModule),
  ],

  controllers: [
    AdminController,
    UserManagementController,
    GarantsController,
    ScamformController
  ],
  providers: [AdminService],
  exports: [AdminService]
})
export class AdminModule { }
