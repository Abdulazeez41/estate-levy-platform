import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private receiptQueue: Queue | null = null;
  private paystackRetryQueue: Queue | null = null;
  private notificationQueue: Queue | null = null;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;
    const connection = { url: redisUrl };
    this.receiptQueue = new Queue('receipt-generation', { connection });
    this.paystackRetryQueue = new Queue('paystack-retry', { connection });
    this.notificationQueue = new Queue('notification-delivery', { connection });
  }

  async enqueueReceiptGeneration(paymentId: string) {
    if (!this.receiptQueue) {
      this.logger.log(`Receipt generation queue unavailable, processing inline for ${paymentId}`);
      return false;
    }
    await this.receiptQueue.add('generate-receipt', { paymentId });
    return true;
  }

  async enqueuePaystackRetry(reference: string, reason: string) {
    if (!this.paystackRetryQueue) {
      this.logger.warn(`Paystack retry queue unavailable for ${reference}: ${reason}`);
      return false;
    }
    await this.paystackRetryQueue.add('retry-paystack-verification', { reference, reason }, { attempts: 3, backoff: { type: 'exponential', delay: 60000 } });
    return true;
  }

  async enqueueNotificationDelivery(payload: {
    channel: 'sms' | 'email' | 'whatsapp' | 'in_app';
    recipientId: string;
    recipientName?: string;
    email?: string | null;
    phone?: string | null;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    if (!this.notificationQueue) {
      this.logger.log(`Notification queue unavailable, inline placeholder for ${payload.recipientId}`);
      return false;
    }
    await this.notificationQueue.add('deliver-notification', payload, { attempts: 5, backoff: { type: 'exponential', delay: 30000 } });
    return true;
  }
}
