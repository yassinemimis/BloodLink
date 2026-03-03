import { Module } from '@nestjs/common';
import { BloodRequestsService } from './blood-requests.service';
import { BloodRequestsController } from './blood-requests.controller';
import { MatchingModule } from '../matching/matching.module';

@Module({
  imports: [MatchingModule],
  controllers: [BloodRequestsController],
  providers: [BloodRequestsService],
  exports: [BloodRequestsService],
})
export class BloodRequestsModule {}