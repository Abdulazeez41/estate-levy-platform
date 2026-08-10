import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { createHmac, randomUUID } from 'crypto';
import { NotificationType, PaymentMethod, PaymentStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { JobsService } from '../jobs/jobs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ManualPaymentDto } from './dto/manual-payment.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { PaystackInitDto } from './dto/paystack-init.dto';
import { UpsertReceivingAccountDto } from './dto/upsert-receiving-account.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly receiptsService: ReceiptsService,
    private readonly jobsService: JobsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private readonly manualMethods: PaymentMethod[] = [PaymentMethod.MANUAL_OPAY, PaymentMethod.MANUAL_MONIEPOINT, PaymentMethod.MANUAL_PALMPAY, PaymentMethod.MANUAL_BANK];

  private isPendingManualPayment(status: PaymentStatus) {
    return status === PaymentStatus.AWAITING_CONFIRMATION || status === PaymentStatus.MANUAL_TRANSFER_SUBMITTED;
  }

  getReceivingAccounts() {
    return this.prisma.receivingAccount.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
  }

  getReceivingAccount() {
    return this.prisma.receivingAccount.findFirst({ where: { isActive: true }, orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }] });
  }

  async upsertReceivingAccount(dto: UpsertReceivingAccountDto, chairmanId: string) {
    const existing = await this.prisma.receivingAccount.findFirst({ where: { providerKey: 'estate-primary' } });
    const payload = {
      bankName: dto.bankName.trim(),
      accountName: dto.accountName.trim(),
      accountNumber: dto.accountNumber.trim(),
      instructions: dto.instructions?.trim() || null,
      providerKey: 'estate-primary',
      isActive: true,
    };

    return this.prisma.$transaction(async (tx) => {
      await tx.receivingAccount.updateMany({ where: { providerKey: { not: 'estate-primary' } }, data: { isActive: false } });
      const record = existing
        ? await tx.receivingAccount.update({ where: { providerKey: 'estate-primary' }, data: payload })
        : await tx.receivingAccount.create({ data: payload });

      await tx.auditLog.create({
        data: {
          userId: chairmanId,
          action: existing ? 'RECEIVING_ACCOUNT_UPDATED' : 'RECEIVING_ACCOUNT_CREATED',
          entity: 'ReceivingAccount',
          entityId: record.id,
          newValue: { bankName: record.bankName, accountName: record.accountName, accountNumber: record.accountNumber, instructions: record.instructions },
        },
      });

      return record;
    });
  }

  async createManualSubmission(dto: ManualPaymentDto, actorId: string) {
    if (dto.residentId !== actorId) throw new ForbiddenException('You can only submit payments for your own household');
    if (!this.manualMethods.includes(dto.paymentMethod)) throw new BadRequestException('Unsupported manual transfer method');

    const [resident, levy, existing] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.residentId } }),
      this.prisma.levy.findUnique({ where: { id: dto.levyId } }),
      this.prisma.payment.findFirst({
        where: {
          residentId: dto.residentId,
          levyId: dto.levyId,
          status: { in: [PaymentStatus.MANUAL_TRANSFER_SUBMITTED, PaymentStatus.AWAITING_CONFIRMATION, PaymentStatus.CONFIRMED, PaymentStatus.COMPLETED] },
        },
      }),
    ]);
    if (!resident || resident.role !== Role.RESIDENT || !resident.isActive) throw new NotFoundException('Resident not found or inactive');
    if (!levy) throw new NotFoundException('Levy not found');
    if (!(await this.getReceivingAccount())) throw new BadRequestException('The chairman has not configured an active payment account yet');
    if (dto.amount !== levy.amount) throw new BadRequestException('Amount must match the current levy amount');
    if (existing) throw new BadRequestException('A payment already exists for this levy cycle');

    const chairman = await this.prisma.user.findFirst({ where: { role: Role.CHAIRMAN } });
    const payment = await this.prisma.payment.create({
      data: {
        levyId: dto.levyId,
        residentId: dto.residentId,
        paymentMethod: dto.paymentMethod,
        amount: dto.amount,
        status: PaymentStatus.MANUAL_TRANSFER_SUBMITTED,
        reference: dto.reference,
        receiptUrl: dto.receiptUrl,
        note: dto.note,
        transferDate: new Date(dto.transferDate),
        submittedAt: new Date(),
      },
    });

    if (chairman) {
      await this.notificationsService.dispatchToUser({
        recipientId: chairman.id,
        type: NotificationType.PAYMENT_SUBMITTED,
        title: 'New manual payment submitted',
        message: `${resident.fullName} submitted a manual transfer proof for review.`,
        channels: ['in_app', 'email'],
        metadata: { paymentId: payment.id },
      });
    }

    await this.prisma.auditLog.create({ data: { userId: resident.id, action: 'PAYMENT_SUBMITTED', entity: 'Payment', entityId: payment.id, newValue: { status: PaymentStatus.MANUAL_TRANSFER_SUBMITTED, amount: payment.amount } } });
    return payment;
  }

  async initializePaystack(dto: PaystackInitDto, actorId: string) {
    if (dto.residentId !== actorId) throw new ForbiddenException('You can only initialize payments for your own account');
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new BadRequestException('Paystack is not configured');

    const [resident, levy, existing] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.residentId } }),
      this.prisma.levy.findUnique({ where: { id: dto.levyId } }),
      this.prisma.payment.findFirst({ where: { residentId: dto.residentId, levyId: dto.levyId, status: { in: [PaymentStatus.PENDING_PAYMENT, PaymentStatus.COMPLETED, PaymentStatus.CONFIRMED] } } }),
    ]);
    if (!resident || resident.role !== Role.RESIDENT) throw new NotFoundException('Resident not found');
    if (!levy) throw new NotFoundException('Levy not found');
    if (existing) throw new BadRequestException('A payment already exists for this levy cycle');

    const reference = `GV-PAY-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    await this.prisma.payment.create({ data: { levyId: levy.id, residentId: resident.id, paymentMethod: PaymentMethod.PAYSTACK_CARD, amount: levy.amount, status: PaymentStatus.PENDING_PAYMENT, reference, gateway: 'paystack', gatewayReference: reference } });

    const { data } = await axios.post('https://api.paystack.co/transaction/initialize', { email: resident.email, amount: levy.amount * 100, reference, callback_url: process.env.PAYSTACK_CALLBACK_URL, metadata: { residentId: resident.id, levyId: levy.id } }, { headers: { Authorization: `Bearer ${secret}` } });
    return { reference, authorizationUrl: data.data.authorization_url, accessCode: data.data.access_code };
  }

  async verifyPaystack(reference: string, actorId?: string) {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new BadRequestException('Paystack is not configured');
    const payment = await this.prisma.payment.findUnique({ where: { reference }, include: { levy: true, resident: true } });
    if (!payment) throw new NotFoundException('Payment reference not found');
    if (actorId && payment.residentId !== actorId) throw new ForbiddenException('You can only verify your own payment');

    try {
      const { data } = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, { headers: { Authorization: `Bearer ${secret}` } });
      const verification = data.data;
      if (verification.status !== 'success') throw new BadRequestException('Payment has not been completed successfully');
      if (Number(verification.amount) !== payment.amount * 100) throw new BadRequestException('Verified amount does not match the levy amount');
      if (verification.currency && verification.currency !== 'NGN') throw new BadRequestException('Verified currency does not match the levy currency');
      await this.completeOnlinePayment(payment.id, String(verification.reference ?? reference));
      return { success: true };
    } catch (error) {
      await this.jobsService.enqueuePaystackRetry(reference, error instanceof Error ? error.message : 'verification_error');
      throw error;
    }
  }

  async processWebhook(payload: any, signature?: string, rawBody?: string | Buffer) {
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;
    if (secret && signature) {
      const body = rawBody ?? JSON.stringify(payload);
      const digest = createHmac('sha512', secret).update(body).digest('hex');
      if (digest !== signature) throw new ForbiddenException('Invalid Paystack webhook signature');
    }
    const event = payload?.event;
    const reference = payload?.data?.reference;
    if (event === 'charge.success' && reference) {
      try {
        await this.verifyPaystack(reference);
      } catch (error) {
        await this.jobsService.enqueuePaystackRetry(reference, error instanceof Error ? error.message : 'webhook_verification_error');
      }
    }
    return { received: true };
  }

  async approvePayment(paymentId: string, chairmanId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { resident: true, levy: true } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (!this.isPendingManualPayment(payment.status)) throw new BadRequestException('Only pending manual payments can be approved');

    return this.prisma.$transaction(async (tx) => {
      const updatedCount = await tx.payment.updateMany({
        where: { id: payment.id, status: { in: [PaymentStatus.AWAITING_CONFIRMATION, PaymentStatus.MANUAL_TRANSFER_SUBMITTED] } },
        data: { status: PaymentStatus.COMPLETED, confirmedAt: new Date(), confirmedBy: chairmanId },
      });
      if (updatedCount.count !== 1) throw new BadRequestException('Payment approval conflict detected');
      await tx.auditLog.create({ data: { userId: chairmanId, action: 'PAYMENT_APPROVED', entity: 'Payment', entityId: payment.id, oldValue: { status: payment.status }, newValue: { status: PaymentStatus.COMPLETED } } });
      return { success: true };
    }).then(async (result) => {
      await this.notificationsService.dispatchToUser({
        recipientId: payment.residentId,
        type: NotificationType.PAYMENT_CONFIRMED,
        title: 'Payment confirmed',
        message: `Your ${payment.levy.month}/${payment.levy.year} levy payment has been confirmed.`,
        channels: ['in_app', 'email', 'whatsapp'],
        metadata: { paymentId: payment.id },
      });
      const queued = await this.jobsService.enqueueReceiptGeneration(paymentId);
      if (!queued) await this.receiptsService.generatePaymentReceipt(paymentId);
      return result;
    });
  }

  async rejectPayment(paymentId: string, chairmanId: string, dto: RejectPaymentDto) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { resident: true, levy: true } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (!this.isPendingManualPayment(payment.status)) throw new BadRequestException('Only pending manual payments can be rejected');

    return this.prisma.$transaction(async (tx) => {
      const updatedCount = await tx.payment.updateMany({
        where: { id: payment.id, status: { in: [PaymentStatus.AWAITING_CONFIRMATION, PaymentStatus.MANUAL_TRANSFER_SUBMITTED] } },
        data: { status: PaymentStatus.REJECTED, rejectionReason: dto.reason },
      });
      if (updatedCount.count !== 1) throw new BadRequestException('Payment rejection conflict detected');
      await tx.auditLog.create({ data: { userId: chairmanId, action: 'PAYMENT_REJECTED', entity: 'Payment', entityId: payment.id, oldValue: { status: payment.status }, newValue: { status: PaymentStatus.REJECTED, reason: dto.reason } } });
      return { success: true };
    }).then(async (result) => {
      await this.notificationsService.dispatchToUser({
        recipientId: payment.residentId,
        type: NotificationType.PAYMENT_REJECTED,
        title: 'Payment rejected',
        message: `Your submission for ${payment.levy.month}/${payment.levy.year} was rejected: ${dto.reason}`,
        channels: ['in_app', 'email', 'sms'],
        metadata: { paymentId: payment.id },
      });
      return result;
    });
  }

  private async completeOnlinePayment(paymentId: string, gatewayReference: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { levy: true, resident: true } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === PaymentStatus.COMPLETED) return { success: true };

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.COMPLETED, confirmedAt: new Date(), gatewayReference } });
      await tx.auditLog.create({ data: { userId: payment.residentId, action: 'PAYMENT_VERIFIED', entity: 'Payment', entityId: payment.id, newValue: { gatewayReference } } });
    });

    await this.notificationsService.dispatchToUser({
      recipientId: payment.residentId,
      type: NotificationType.PAYMENT_CONFIRMED,
      title: 'Online payment verified',
      message: `Your online payment for ${payment.levy.month}/${payment.levy.year} has been verified.`,
      channels: ['in_app', 'email', 'whatsapp'],
      metadata: { paymentId: payment.id },
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
