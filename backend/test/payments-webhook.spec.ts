import { PaymentsService } from '../src/payments/payments.service';
import { createHmac } from 'crypto';

describe('PaymentsService webhook flow', () => {
  it('accepts charge.success webhook and attempts verification', async () => {
    const previousSecret = process.env.PAYSTACK_SECRET_KEY;
    const secret = 'webhook-test-secret';
    process.env.PAYSTACK_SECRET_KEY = secret;
    const prisma: any = { webhookEvent: { create: jest.fn().mockResolvedValue({ id: 'event-1' }), update: jest.fn().mockResolvedValue({}) } };
    const receiptsService: any = {};
    const jobsService: any = { enqueueReceiptGeneration: jest.fn(), enqueuePaystackRetry: jest.fn(), enqueueNotificationDelivery: jest.fn() };
    const notificationsService: any = { dispatchToUser: jest.fn().mockResolvedValue({}) };
    const service = new PaymentsService(prisma, receiptsService, jobsService, notificationsService);
    const verifySpy = jest.spyOn(service, 'verifyPaystack').mockResolvedValue({ success: true } as any);

    const payload = { event: 'charge.success', data: { id: 1, reference: 'GV-TEST-1' } };
    const rawBody = JSON.stringify(payload);
    const signature = createHmac('sha512', secret).update(rawBody).digest('hex');
    const result = await service.processWebhook(payload, signature, rawBody);

    expect(result).toEqual({ received: true });
    expect(verifySpy).toHaveBeenCalledWith('GV-TEST-1');
    process.env.PAYSTACK_SECRET_KEY = previousSecret;
  });
});
