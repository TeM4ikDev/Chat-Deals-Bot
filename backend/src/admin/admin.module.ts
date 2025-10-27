import { DatabaseModule } from '@/database/database.module';
import { TelegramModule } from '@/telegram/telegram.module';
import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserManagementController } from './controllers/user.controller';

@Module({
  imports: [
    DatabaseModule,
    JwtModule,
    forwardRef(() => UsersModule),
    forwardRef(() => TelegramModule),
    // MulterModule.register({
      
    // }),
  ],

  controllers: [
    AdminController,
    UserManagementController,
  ],
  providers: [AdminService, UserManagementController],
  exports: [AdminService, UserManagementController]
})
export class AdminModule { }
