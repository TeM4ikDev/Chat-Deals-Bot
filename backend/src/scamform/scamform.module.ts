import { DatabaseModule } from '@/database/database.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScamformController } from './scamform.controller';
import { ScamformService } from './scamform.service';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [ScamformController],
  providers: [ScamformService],
  exports: [ScamformService]
})
export class ScamformModule {}
