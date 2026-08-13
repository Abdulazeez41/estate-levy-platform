import { PaymentsService } from '../src/payments/payments.service';
import { createHmac } from 'crypto';

describe('PaymentsService webhook', () => {
  it('accepts successful charge webhook and acknowledges receipt', async () => {
    const previousSecret = process.env.PAYSTACK_SECRET_KEY;
    const secret = 'webhook-test-secret';
    process.env.PAYSTACK_SECRET_KEY = secret;
    const prisma: any = { user: { findFirst: jest.fn() }, webhookEvent: { create: jest.fn().mockResolvedValue({ id: 'event-1' }), update: jest.fn().mockResolvedValue({}) } };
    const receiptsService: any = { generatePaymentReceipt: jest.fn() };
    const jobsService: any = { enqueuePaystackRetry: jest.fn().mockResolvedValue(true), enqueueReceiptGeneration: jest.fn().mockResolvedValue(true) };
    const notificationsService: any = { dispatchToUser: jest.fn().mockResolvedValue({}) };
    const service = new PaymentsService(prisma, receiptsService, jobsService, notificationsService);
    service.verifyPaystack = jest.fn().mockResolvedValue({ success: true });

    const payload = { event: 'charge.success', data: { id: 2, reference: 'GV-PAY-001' } };
    const rawBody = JSON.stringify(payload);
    const signature = createHmac('sha512', secret).update(rawBody).digest('hex');
    const response = await service.processWebhook(payload, signature, rawBody);
    expect(response).toEqual({ received: true });
    expect(service.verifyPaystack).toHaveBeenCalledWith('GV-PAY-001');
    process.env.PAYSTACK_SECRET_KEY = previousSecret;
  });
});
