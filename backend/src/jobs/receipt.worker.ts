import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { ReceiptsService } from '../receipts/receipts.service';

@Injectable()
export class ReceiptWorker implements OnModuleInit {
  private readonly logger = new Logger(ReceiptWorker.name);
  constructor(private readonly receiptsService: ReceiptsService) {}

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;
    new Worker(
      'receipt-generation',
      async (job) => {
        await this.receiptsService.generatePaymentReceipt(job.data.paymentId);
      },
      { connection: { url: redisUrl } },
    ).on('failed', (_job, error) => this.logger.error(error.message));
  }
}
