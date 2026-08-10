import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';

@Injectable()
export class PaystackRetryWorker implements OnModuleInit {
  private readonly logger = new Logger(PaystackRetryWorker.name);

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;
    new Worker(
      'paystack-retry',
      async (job) => {
        this.logger.warn(`Retry requested for Paystack reference ${job.data.reference}: ${job.data.reason}`);
      },
      { connection: { url: redisUrl } },
    );
  }
}
