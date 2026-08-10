import { PaymentMethod, PaymentStatus, Role } from '@prisma/client';
import { PaymentsService } from '../src/payments/payments.service';

describe('PaymentsService lifecycle', () => {
  it('creates manual submissions as manual-transfer-submitted and notifies the chairman', async () => {
    const prisma: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'resident-1', role: Role.RESIDENT, isActive: true, fullName: 'Ada Resident' }),
        findFirst: jest.fn().mockResolvedValue({ id: 'chairman-1', role: Role.CHAIRMAN }),
      },
      levy: { findUnique: jest.fn().mockResolvedValue({ id: 'levy-1', amount: 2500 }) },
      payment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'payment-1', amount: 2500 }),
      },
      receivingAccount: { findFirst: jest.fn().mockResolvedValue({ id: 'account-1' }) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const receiptsService: any = {};
    const jobsService: any = { enqueueReceiptGeneration: jest.fn(), enqueuePaystackRetry: jest.fn(), enqueueNotificationDelivery: jest.fn() };
    const notificationsService: any = { dispatchToUser: jest.fn().mockResolvedValue({}) };
    const service = new PaymentsService(prisma, receiptsService, jobsService, notificationsService);

    await service.createManualSubmission(
      {
        residentId: 'resident-1',
        levyId: 'levy-1',
        paymentMethod: PaymentMethod.MANUAL_BANK,
        amount: 2500,
        transferDate: '2026-08-10',
        reference: 'GTB/123456789',
        receiptUrl: 'https://files.example/receipt.pdf',
        note: 'Paid from mobile banking',
      },
      'resident-1',
    );

    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PaymentStatus.MANUAL_TRANSFER_SUBMITTED,
          reference: 'GTB/123456789',
          receiptUrl: 'https://files.example/receipt.pdf',
        }),
      }),
    );
    expect(notificationsService.dispatchToUser).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'chairman-1',
        type: 'PAYMENT_SUBMITTED',
      }),
    );
  });

  it('approves a manual transfer submission and generates a receipt', async () => {
    const payment = {
      id: 'payment-2',
      residentId: 'resident-1',
      status: PaymentStatus.MANUAL_TRANSFER_SUBMITTED,
      levy: { month: 8, year: 2026 },
      resident: { fullName: 'Ada Resident' },
    };
    const prisma: any = {
      payment: { findUnique: jest.fn().mockResolvedValue(payment) },
      $transaction: jest.fn().mockImplementation(async (handler: any) => {
        await handler({
          payment: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        });
        return { success: true };
      }),
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'chairman-1', role: Role.CHAIRMAN }) },
    };
    const receiptsService: any = { generatePaymentReceipt: jest.fn().mockResolvedValue({ fileUrl: 'https://files.example/receipt.pdf' }) };
    const jobsService: any = { enqueueReceiptGeneration: jest.fn().mockResolvedValue(false), enqueuePaystackRetry: jest.fn(), enqueueNotificationDelivery: jest.fn() };
    const notificationsService: any = { dispatchToUser: jest.fn().mockResolvedValue({}) };
    const service = new PaymentsService(prisma, receiptsService, jobsService, notificationsService);

    const result = await service.approvePayment('payment-2', 'chairman-1');

    expect(result).toEqual({ success: true });
    expect(jobsService.enqueueReceiptGeneration).toHaveBeenCalledWith('payment-2');
    expect(receiptsService.generatePaymentReceipt).toHaveBeenCalledWith('payment-2');
    expect(notificationsService.dispatchToUser).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'resident-1',
        type: 'PAYMENT_CONFIRMED',
      }),
    );
  });
});
