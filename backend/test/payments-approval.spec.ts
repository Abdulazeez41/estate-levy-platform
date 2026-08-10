import { PaymentStatus } from '@prisma/client';
import { PaymentsService } from '../src/payments/payments.service';

describe('PaymentsService approval flow', () => {
  it('approves awaiting confirmation payment and triggers receipt generation', async () => {
    const prisma: any = {
      payment: { findUnique: jest.fn().mockResolvedValue({ id: 'pay1', residentId: 'resident1', levy: { month: 8, year: 2026 }, status: PaymentStatus.AWAITING_CONFIRMATION }) },
      $transaction: jest.fn().mockImplementation(async (handler: any) => {
        await handler({
          payment: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        });
        return { success: true };
      }),
    };
    const receiptsService: any = { generatePaymentReceipt: jest.fn().mockResolvedValue({ fileUrl: 'http://localhost/receipt.pdf' }) };
    const jobsService: any = { enqueueReceiptGeneration: jest.fn().mockResolvedValue(false), enqueuePaystackRetry: jest.fn(), enqueueNotificationDelivery: jest.fn() };
    const notificationsService: any = { dispatchToUser: jest.fn().mockResolvedValue({}) };
    const service = new PaymentsService(prisma, receiptsService, jobsService, notificationsService);

    const result = await service.approvePayment('pay1', 'chair1');

    expect(result).toEqual({ success: true });
    expect(notificationsService.dispatchToUser).toHaveBeenCalled();
    expect(jobsService.enqueueReceiptGeneration).toHaveBeenCalledWith('pay1');
    expect(receiptsService.generatePaymentReceipt).toHaveBeenCalledWith('pay1');
  });
});
