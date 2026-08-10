import { PaymentsService } from '../src/payments/payments.service';

describe('PaymentsService webhook flow', () => {
  it('accepts charge.success webhook and attempts verification', async () => {
    const prisma: any = {};
    const receiptsService: any = {};
    const jobsService: any = { enqueueReceiptGeneration: jest.fn(), enqueuePaystackRetry: jest.fn(), enqueueNotificationDelivery: jest.fn() };
    const notificationsService: any = { dispatchToUser: jest.fn().mockResolvedValue({}) };
    const service = new PaymentsService(prisma, receiptsService, jobsService, notificationsService);
    const verifySpy = jest.spyOn(service, 'verifyPaystack').mockResolvedValue({ success: true } as any);

    const result = await service.processWebhook({ event: 'charge.success', data: { reference: 'GV-TEST-1' } }, undefined);

    expect(result).toEqual({ received: true });
    expect(verifySpy).toHaveBeenCalledWith('GV-TEST-1');
  });
});
