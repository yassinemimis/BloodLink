import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BloodRequestsModule } from './modules/blood-requests/blood-requests.module';
import { DonationsModule } from './modules/donations/donations.module';
import { CentersModule } from './modules/centers/centers.module';
import { MatchingModule } from './modules/matching/matching.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    BloodRequestsModule,
    DonationsModule,
    CentersModule,
    MatchingModule,
    NotificationsModule,
  ],
})
export class AppModule {}