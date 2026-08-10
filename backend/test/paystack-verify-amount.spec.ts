import axios from 'axios';
import { PaymentStatus } from '@prisma/client';
import { PaymentsService } from '../src/payments/payments.service';

describe('PaymentsService Paystack verification', () => {
  it('rejects a verified payment when the amount does not match the levy', async () => {
    const previousSecret = process.env.PAYSTACK_SECRET_KEY;
    process.env.PAYSTACK_SECRET_KEY = 'test-secret';
    jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: {
        data: {
          status: 'success',
          amount: 240000,
          currency: 'NGN',
          reference: 'GV-PAY-001',
        },
      },
    } as any);

    const prisma: any = {
      payment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'payment-1',
          residentId: 'resident-1',
          amount: 2500,
          status: PaymentStatus.PENDING_PAYMENT,
          levy: { month: 8, year: 2026, amount: 2500 },
          resident: { fullName: 'Ada Resident' },
        }),
      },
    };
    const receiptsService: any = {};
    const jobsService: any = { enqueueReceiptGeneration: jest.fn(), enqueuePaystackRetry: jest.fn(), enqueueNotificationDelivery: jest.fn() };
    const notificationsService: any = { dispatchToUser: jest.fn().mockResolvedValue({}) };
    const service = new PaymentsService(prisma, receiptsService, jobsService, notificationsService);

    await expect(service.verifyPaystack('GV-PAY-001', 'resident-1')).rejects.toThrow('Verified amount does not match the levy amount');
    expect(jobsService.enqueuePaystackRetry).toHaveBeenCalledWith('GV-PAY-001', 'Verified amount does not match the levy amount');
    process.env.PAYSTACK_SECRET_KEY = previousSecret;
  });
});
