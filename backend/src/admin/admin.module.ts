import { DatabaseModule } from '@/database/database.module';
import { ScamformModule } from '@/scamform/scamform.module';
import { TelegramModule } from '@/telegram/telegram.module';
import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ChatMessagesController } from './controllers/chatMessages.controller';
import { GarantsController } from './controllers/garants.controller';
import { ScamformController } from './controllers/scamforms.controller';
import { UserManagementController } from './controllers/user.controller';

@Module({
  imports: [
    DatabaseModule,
    JwtModule,
    ScamformModule,
    forwardRef(() => UsersModule),
    forwardRef(() => TelegramModule),
    // MulterModule.register({
      
    // }),
  ],

  controllers: [
    AdminController,
    UserManagementController,
    GarantsController,
    ScamformController,
    ChatMessagesController,
  ],
  providers: [AdminService, UserManagementController],
  exports: [AdminService, UserManagementController]
})
export class AdminModule { }
