import { PaymentsService } from '../src/payments/payments.service';

describe('PaymentsService webhook', () => {
  it('accepts successful charge webhook and acknowledges receipt', async () => {
    const prisma: any = { user: { findFirst: jest.fn() } };
    const receiptsService: any = { generatePaymentReceipt: jest.fn() };
    const jobsService: any = { enqueuePaystackRetry: jest.fn().mockResolvedValue(true), enqueueReceiptGeneration: jest.fn().mockResolvedValue(true) };
    const notificationsService: any = { dispatchToUser: jest.fn().mockResolvedValue({}) };
    const service = new PaymentsService(prisma, receiptsService, jobsService, notificationsService);
    service.verifyPaystack = jest.fn().mockResolvedValue({ success: true });

    const response = await service.processWebhook({ event: 'charge.success', data: { reference: 'GV-PAY-001' } });
    expect(response).toEqual({ received: true });
    expect(service.verifyPaystack).toHaveBeenCalledWith('GV-PAY-001');
  });
});
