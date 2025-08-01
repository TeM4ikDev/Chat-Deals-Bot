import { DatabaseModule } from '@/database/database.module';
import { UsersModule } from '@/users/users.module';
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScamformController } from './scamform.controller';
import { ScamformService } from './scamform.service';

@Module({
  imports: [
    DatabaseModule,
     ConfigModule,
     forwardRef(() => UsersModule)
    ],
  controllers: [ScamformController],
  providers: [ScamformService],
  exports: [ScamformService]
})
export class ScamformModule {}
