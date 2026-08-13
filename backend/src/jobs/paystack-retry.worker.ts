import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import axios from 'axios';
import { InvoiceStatus, NotificationType, PaymentAttemptStatus, PaymentIntentStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaystackRetryWorker implements OnModuleInit {
  private readonly logger = new Logger(PaystackRetryWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly receiptsService: ReceiptsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;
    new Worker(
      'paystack-retry',
      async (job) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) throw new Error('Paystack is not configured');
        const payment = await this.prisma.payment.findUnique({ where: { reference: job.data.reference }, include: { invoice: true } });
        if (!payment) throw new Error('Payment reference not found');
        if (payment.status === PaymentStatus.CONFIRMED || payment.status === PaymentStatus.COMPLETED) return;
        const { data } = await axios.get(`https://api.paystack.co/transaction/verify/${payment.reference}`, { headers: { Authorization: `Bearer ${secret}` } });
        const verification = data.data;
        if (verification.status !== 'success') throw new Error(`Paystack status is ${verification.status}`);
        if (Number(verification.amount) !== payment.amount * 100) throw new Error('Verified amount mismatch');
        if (verification.currency && verification.currency !== (payment.invoice?.currency ?? 'NGN')) throw new Error('Verified currency mismatch');
        await this.prisma.$transaction(async (tx) => {
          await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.CONFIRMED, confirmedAt: new Date(), gatewayReference: String(verification.reference) } });
          if (payment.invoiceId) await tx.invoice.update({ where: { id: payment.invoiceId }, data: { status: InvoiceStatus.CONFIRMED, paidAt: new Date() } });
          const intent = await tx.paymentIntent.findUnique({ where: { reference: payment.reference } });
          if (intent) {
            await tx.paymentIntent.update({ where: { id: intent.id }, data: { status: PaymentIntentStatus.SUCCEEDED } });
            await tx.paymentAttempt.updateMany({ where: { intentId: intent.id }, data: { status: PaymentAttemptStatus.SUCCEEDED, gatewayReference: String(verification.reference) } });
          }
        });
        await this.notificationsService.dispatchToUser({ recipientId: payment.residentId, type: NotificationType.PAYMENT_CONFIRMED, title: 'Online payment verified', message: 'Your online levy payment has been verified.', channels: ['in_app', 'email', 'whatsapp'], dedupeKey: `payment:${payment.id}:confirmed` });
        await this.receiptsService.generatePaymentReceipt(payment.id);
        this.logger.log(`Reconciled Paystack payment ${payment.reference}`);
      },
      { connection: { url: redisUrl }, concurrency: 2 },
    );
  }
}
