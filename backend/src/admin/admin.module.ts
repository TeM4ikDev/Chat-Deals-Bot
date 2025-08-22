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
import { MulterModule } from '@nestjs/platform-express';
import multer, { diskStorage } from 'multer';
import { ChatMessagesController } from './controllers/chatMessages.controller';

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
    ChatMessagesController
  ],
  providers: [AdminService, UserManagementController],
  exports: [AdminService, UserManagementController]
})
export class AdminModule { }
