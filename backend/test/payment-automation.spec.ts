import { ForbiddenException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { InvoiceStatus, LevyStatus, WebhookEventStatus } from '@prisma/client';
import { LeviesService } from '../src/levies/levies.service';
import { PaymentsService } from '../src/payments/payments.service';
import { RemindersService } from '../src/reminders/reminders.service';

describe('Payment automation', () => {
  it('creates one invoice for every household in a new levy cycle', async () => {
    const tx: any = {
      levy: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), create: jest.fn().mockResolvedValue({ id: 'levy-2', month: 9, year: 2026, amount: 5000, currency: 'NGN', dueDate: new Date('2026-09-10'), reminderDaysBefore: 3, status: LevyStatus.ACTIVE }) },
      household: { findMany: jest.fn().mockResolvedValue([{ id: 'h1', residentId: 'r1' }, { id: 'h2', residentId: 'r2' }]) },
      invoice: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma: any = { $transaction: jest.fn((handler) => handler(tx)) };
    const service = new LeviesService(prisma);
    const result = await service.create({ month: 9, year: 2026, amount: 5000, currency: 'NGN', dueDate: '2026-09-10T23:59:59.000Z', reminderDaysBefore: 3 }, 'chairman-1');
    expect(result.invoiceCount).toBe(2);
    expect(tx.invoice.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ householdId: 'h1', status: InvoiceStatus.PENDING_PAYMENT })]) }));
  });

  it('rejects unsigned Paystack webhooks', async () => {
    const previousSecret = process.env.PAYSTACK_SECRET_KEY;
    const secret = 'webhook-test-secret';
    process.env.PAYSTACK_SECRET_KEY = secret;
    const service = new PaymentsService({} as any, {} as any, {} as any, {} as any);
    await expect(service.processWebhook({ event: 'charge.success', data: { reference: 'ref-1' } })).rejects.toBeInstanceOf(ForbiddenException);
    process.env.PAYSTACK_SECRET_KEY = previousSecret;
  });

  it('records and processes a signed webhook once', async () => {
    const previousSecret = process.env.PAYSTACK_SECRET_KEY;
    const secret = 'webhook-test-secret';
    process.env.PAYSTACK_SECRET_KEY = secret;
    const prisma: any = { webhookEvent: { create: jest.fn().mockResolvedValue({ id: 'event-1' }), update: jest.fn().mockResolvedValue({}) } };
    const service = new PaymentsService(prisma, {} as any, { enqueuePaystackRetry: jest.fn() } as any, {} as any);
    jest.spyOn(service, 'verifyPaystack').mockResolvedValue({ success: true } as any);
    const payload = { event: 'charge.success', data: { id: 99, reference: 'ref-1' } };
    const raw = JSON.stringify(payload);
    const signature = createHmac('sha512', secret).update(raw).digest('hex');
    await service.processWebhook(payload, signature, raw);
    expect(prisma.webhookEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventId: '99', status: WebhookEventStatus.RECEIVED }) }));
    expect(prisma.webhookEvent.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: WebhookEventStatus.PROCESSED }) }));
    process.env.PAYSTACK_SECRET_KEY = previousSecret;
  });

  it('marks unpaid invoices overdue and sends a deduplicated notification', async () => {
    const prisma: any = {
      levy: { findMany: jest.fn().mockResolvedValue([{ id: 'levy-1', status: LevyStatus.ACTIVE, dueDate: new Date('2026-08-01'), reminderDaysBefore: 3, invoices: [{ id: 'invoice-1', residentId: 'resident-1', amount: 5000, currency: 'NGN', dueDate: new Date('2026-08-01'), status: InvoiceStatus.PENDING_PAYMENT, household: { houseNumber: 'A1' }, resident: {} }] }]) },
      invoice: { update: jest.fn().mockResolvedValue({}) },
    };
    const notifications: any = { dispatchToUser: jest.fn().mockResolvedValue({}) };
    const service = new RemindersService(prisma, notifications);
    const result = await service.processScheduledReminders(new Date('2026-08-11T12:00:00.000Z'));
    expect(result.overdueSent).toBe(1);
    expect(prisma.invoice.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: InvoiceStatus.OVERDUE } }));
    expect(notifications.dispatchToUser).toHaveBeenCalledWith(expect.objectContaining({ dedupeKey: 'invoice:invoice-1:overdue:2026-08-11' }));
  });
});
