import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import envValidation from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HouseholdsModule } from './households/households.module';
import { PaymentsModule } from './payments/payments.module';
import { MeetingsModule } from './meetings/meetings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UploadsModule } from './uploads/uploads.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { JobsModule } from './jobs/jobs.module';
import { RemindersModule } from './reminders/reminders.module';
import { HealthController } from './health.controller';
import { LeviesModule } from './levies/levies.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: envValidation }),
    PrismaModule,
    AuthModule,
    DashboardModule,
    HouseholdsModule,
    PaymentsModule,
    MeetingsModule,
    NotificationsModule,
    UploadsModule,
    ReceiptsModule,
    JobsModule,
    RemindersModule,
    LeviesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
