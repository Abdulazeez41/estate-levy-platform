import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { InvoiceStatus, NotificationType, PaymentAttemptStatus, PaymentIntentStatus, PaymentMethod, PaymentStatus, Prisma, Role, WebhookEventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { JobsService } from '../jobs/jobs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaystackInitDto } from './dto/paystack-init.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly receiptsService: ReceiptsService,
    private readonly jobsService: JobsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async initializePaystack(dto: PaystackInitDto, actorId: string) {
    if (dto.residentId !== actorId) throw new ForbiddenException('You can only initialize payments for your own account');
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new BadRequestException('Paystack is not configured');

    const [resident, levy, invoice] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.residentId } }),
      this.prisma.levy.findUnique({ where: { id: dto.levyId } }),
      this.prisma.invoice.findFirst({ where: { residentId: dto.residentId, levyId: dto.levyId }, include: { intents: { where: { status: { in: [PaymentIntentStatus.PENDING, PaymentIntentStatus.PROCESSING] } }, take: 1 } } }),
    ]);
    if (!resident || resident.role !== Role.RESIDENT) throw new NotFoundException('Resident not found');
    if (!levy) throw new NotFoundException('Levy not found');
    if (!invoice) throw new NotFoundException('Invoice not found for this household and levy cycle');
    if (invoice.status === InvoiceStatus.PENDING_REVIEW || invoice.status === InvoiceStatus.CONFIRMED || invoice.status === InvoiceStatus.REFUNDED) throw new BadRequestException('This invoice already has an active or completed payment');
    if (invoice.intents.length) throw new BadRequestException('An online checkout is already active for this invoice');

    const reference = `GV-PAY-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const initialized = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.invoice.updateMany({ where: { id: invoice.id, status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.PENDING_PAYMENT, InvoiceStatus.REJECTED, InvoiceStatus.OVERDUE, InvoiceStatus.FAILED] } }, data: { status: InvoiceStatus.PROCESSING } });
      if (claimed.count !== 1) throw new BadRequestException('This invoice was updated by another payment request');
      const intent = await tx.paymentIntent.create({ data: { invoiceId: invoice.id, residentId: resident.id, provider: 'paystack', reference, amount: invoice.amount, currency: invoice.currency, status: PaymentIntentStatus.PROCESSING } });
      const payment = await tx.payment.create({ data: { invoiceId: invoice.id, levyId: levy.id, residentId: resident.id, paymentMethod: PaymentMethod.PAYSTACK_CARD, amount: invoice.amount, status: PaymentStatus.PROCESSING, reference, gateway: 'paystack', gatewayReference: reference } });
      const attempt = await tx.paymentAttempt.create({ data: { intentId: intent.id, paymentId: payment.id, status: PaymentAttemptStatus.INITIALIZED } });
      return { intent, payment, attempt };
    });

    try {
      const { data } = await axios.post('https://api.paystack.co/transaction/initialize', { email: resident.email, amount: invoice.amount * 100, currency: invoice.currency, reference, callback_url: process.env.PAYSTACK_CALLBACK_URL, metadata: { residentId: resident.id, levyId: levy.id, invoiceId: invoice.id } }, { headers: { Authorization: `Bearer ${secret}` } });
      await this.prisma.$transaction([
        this.prisma.paymentIntent.update({ where: { id: initialized.intent.id }, data: { status: PaymentIntentStatus.PENDING, authorizationUrl: data.data.authorization_url, accessCode: data.data.access_code } }),
        this.prisma.paymentAttempt.update({ where: { id: initialized.attempt.id }, data: { status: PaymentAttemptStatus.PENDING, providerResponse: data.data } }),
        this.prisma.payment.update({ where: { id: initialized.payment.id }, data: { status: PaymentStatus.PENDING_PAYMENT } }),
      ]);
      return { reference, authorizationUrl: data.data.authorization_url, accessCode: data.data.access_code };
    } catch (error) {
      await this.prisma.$transaction([
        this.prisma.invoice.update({ where: { id: invoice.id }, data: { status: InvoiceStatus.FAILED } }),
        this.prisma.paymentIntent.update({ where: { id: initialized.intent.id }, data: { status: PaymentIntentStatus.FAILED } }),
        this.prisma.paymentAttempt.update({ where: { id: initialized.attempt.id }, data: { status: PaymentAttemptStatus.FAILED, responseMessage: error instanceof Error ? error.message : 'Initialization failed' } }),
        this.prisma.payment.update({ where: { id: initialized.payment.id }, data: { status: PaymentStatus.FAILED } }),
      ]);
      const providerMessage = axios.isAxiosError(error)
        ? String(error.response?.data?.message ?? error.response?.data?.error ?? '')
        : '';
      throw new BadRequestException(providerMessage ? `Paystack could not initialize payment: ${providerMessage}` : 'Paystack could not initialize payment. Check the configured test keys and try again.');
    }
  }

  async verifyPaystack(reference: string, actorId?: string) {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new BadRequestException('Paystack is not configured');
    const payment = await this.prisma.payment.findUnique({ where: { reference }, include: { levy: true, resident: true, invoice: true } });
    if (!payment) throw new NotFoundException('Payment reference not found');
    if (actorId && payment.residentId !== actorId) throw new ForbiddenException('You can only verify your own payment');

    try {
      const { data } = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, { headers: { Authorization: `Bearer ${secret}` } });
      const verification = data.data;
      if (verification.status !== 'success') throw new BadRequestException('Payment has not been completed successfully');
      if (Number(verification.amount) !== payment.amount * 100) throw new BadRequestException('Verified amount does not match the levy amount');
      const expectedCurrency = payment.invoice?.currency ?? payment.levy.currency;
      if (verification.currency && verification.currency !== expectedCurrency) throw new BadRequestException('Verified currency does not match the invoice currency');
      if (String(verification.reference) !== reference) throw new BadRequestException('Verified reference does not match the payment reference');
      if (verification.metadata?.residentId && verification.metadata.residentId !== payment.residentId) throw new BadRequestException('Verified resident does not match the payment owner');
      if (verification.metadata?.invoiceId && verification.metadata.invoiceId !== payment.invoiceId) throw new BadRequestException('Verified invoice does not match the payment intent');
      await this.completeOnlinePayment(payment.id, String(verification.reference ?? reference));
      return { success: true };
    } catch (error) {
      await this.jobsService.enqueuePaystackRetry(reference, error instanceof Error ? error.message : 'verification_error');
      throw error;
    }
  }

  async processWebhook(payload: any, signature?: string, rawBody?: string | Buffer) {
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new ForbiddenException('Paystack webhook secret is not configured');
    if (!signature) throw new ForbiddenException('Missing Paystack webhook signature');
    const body = rawBody ?? JSON.stringify(payload);
    const digest = createHmac('sha512', secret).update(body).digest('hex');
    const expected = Buffer.from(digest, 'hex');
    const received = Buffer.from(signature, 'hex');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) throw new ForbiddenException('Invalid Paystack webhook signature');

    const event = payload?.event;
    const reference = payload?.data?.reference;
    const eventId = String(payload?.data?.id ?? `${event ?? 'unknown'}:${reference ?? createHmac('sha256', secret).update(body).digest('hex')}`);
    let webhook;
    try {
      webhook = await this.prisma.webhookEvent.create({
        data: { provider: 'paystack', eventId, eventType: String(event ?? 'unknown'), reference: reference ? String(reference) : null, signature, payload, status: WebhookEventStatus.RECEIVED },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { received: true, duplicate: true };
      throw error;
    }

    if (event === 'charge.success' && reference) {
      try {
        await this.verifyPaystack(reference);
        await this.prisma.webhookEvent.update({ where: { id: webhook.id }, data: { status: WebhookEventStatus.PROCESSED, processedAt: new Date() } });
      } catch (error) {
        await this.prisma.webhookEvent.update({ where: { id: webhook.id }, data: { status: WebhookEventStatus.FAILED, error: error instanceof Error ? error.message : 'webhook_verification_error', processedAt: new Date() } });
        await this.jobsService.enqueuePaystackRetry(reference, error instanceof Error ? error.message : 'webhook_verification_error');
      }
    } else {
      await this.prisma.webhookEvent.update({ where: { id: webhook.id }, data: { status: WebhookEventStatus.IGNORED, processedAt: new Date() } });
    }
    return { received: true };
  }

  private async completeOnlinePayment(paymentId: string, gatewayReference: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { levy: true, resident: true, invoice: true } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === PaymentStatus.COMPLETED || payment.status === PaymentStatus.CONFIRMED) return { success: true };

    await this.prisma.$transaction(async (tx) => {
      const completed = await tx.payment.updateMany({ where: { id: payment.id, status: { notIn: [PaymentStatus.COMPLETED, PaymentStatus.CONFIRMED] } }, data: { status: PaymentStatus.CONFIRMED, confirmedAt: new Date(), gatewayReference } });
      if (!completed.count) return;
      if (payment.invoiceId) await tx.invoice.update({ where: { id: payment.invoiceId }, data: { status: InvoiceStatus.CONFIRMED, paidAt: new Date() } });
      const intent = await tx.paymentIntent.findUnique({ where: { reference: payment.reference } });
      if (intent) {
        await tx.paymentIntent.update({ where: { id: intent.id }, data: { status: PaymentIntentStatus.SUCCEEDED } });
        await tx.paymentAttempt.updateMany({ where: { intentId: intent.id, paymentId: payment.id }, data: { status: PaymentAttemptStatus.SUCCEEDED, gatewayReference } });
      }
      await tx.auditLog.create({ data: { userId: payment.residentId, action: 'PAYMENT_VERIFIED', entity: 'Payment', entityId: payment.id, newValue: { gatewayReference } } });
    });

    await this.notificationsService.dispatchToUser({
      recipientId: payment.residentId,
      type: NotificationType.PAYMENT_CONFIRMED,
      title: 'Online payment verified',
      message: `Your online payment for ${payment.levy.month}/${payment.levy.year} has been verified.`,
      channels: ['in_app', 'email', 'whatsapp'],
      metadata: { paymentId: payment.id },
      dedupeKey: `payment:${payment.id}:confirmed`,
    });

    const chairman = await this.prisma.user.findFirst({ where: { role: Role.CHAIRMAN } });
    if (chairman) {
      await this.notificationsService.dispatchToUser({
        recipientId: chairman.id,
        type: NotificationType.PAYMENT_CONFIRMED,
        title: 'Online payment completed',
        message: `${payment.resident.fullName} completed an online levy payment.`,
        channels: ['in_app', 'email'],
        metadata: { paymentId: payment.id },
      });
    }

    const queued = await this.jobsService.enqueueReceiptGeneration(paymentId);
    if (!queued) await this.receiptsService.generatePaymentReceipt(paymentId);
    return { success: true };
  }
}
