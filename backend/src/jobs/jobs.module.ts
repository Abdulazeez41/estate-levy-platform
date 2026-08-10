import { Module, forwardRef } from '@nestjs/common';
import { ReceiptsModule } from '../receipts/receipts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { JobsService } from './jobs.service';
import { ReceiptWorker } from './receipt.worker';
import { PaystackRetryWorker } from './paystack-retry.worker';
import { NotificationWorker } from './notification.worker';

@Module({
  imports: [ReceiptsModule, forwardRef(() => NotificationsModule)],
  providers: [JobsService, ReceiptWorker, PaystackRetryWorker, NotificationWorker],
  exports: [JobsService],
})
export class JobsModule {}
