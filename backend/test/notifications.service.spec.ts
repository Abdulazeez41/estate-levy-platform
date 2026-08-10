import { NotificationType } from '@prisma/client';
import { NotificationsService } from '../src/notifications/notifications.service';

describe('NotificationsService state transitions', () => {
  it('marks, archives, and removes notifications for the current user', async () => {
    const prisma: any = {
      notification: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn()
          .mockResolvedValueOnce({ count: 1 })
          .mockResolvedValueOnce({ count: 1 })
          .mockResolvedValueOnce({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'notification-1' }),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'resident-1', fullName: 'Ada Resident', email: 'ada@example.com', phone: '08000000000' }) },
    };
    const jobsService: any = { enqueueNotificationDelivery: jest.fn().mockResolvedValue(true) };
    const service = new NotificationsService(prisma, jobsService);

    await expect(service.markRead('resident-1', 'notif-1')).resolves.toEqual({ success: true });
    await expect(service.archive('resident-1', 'notif-1')).resolves.toEqual({ success: true });
    await expect(service.remove('resident-1', 'notif-1')).resolves.toEqual({ success: true });

    expect(prisma.notification.updateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: { id: 'notif-1', recipientId: 'resident-1' }, data: { read: true } }));
    expect(prisma.notification.updateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: { id: 'notif-1', recipientId: 'resident-1' }, data: { archived: true } }));
    expect(prisma.notification.updateMany).toHaveBeenNthCalledWith(3, expect.objectContaining({ where: { id: 'notif-1', recipientId: 'resident-1' }, data: { deleted: true } }));
  });

  it('dispatches in-app payment notifications with metadata', async () => {
    const prisma: any = {
      notification: { create: jest.fn().mockResolvedValue({ id: 'notification-2' }) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'resident-1', fullName: 'Ada Resident', email: 'ada@example.com', phone: '08000000000' }) },
    };
    const jobsService: any = { enqueueNotificationDelivery: jest.fn().mockResolvedValue(true) };
    const service = new NotificationsService(prisma, jobsService);

    await service.dispatchToUser({
      recipientId: 'resident-1',
      type: NotificationType.PAYMENT_CONFIRMED,
      title: 'Payment confirmed',
      message: 'Your payment has been confirmed.',
      channels: ['in_app'],
      metadata: { paymentId: 'payment-1' },
    });

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipientId: 'resident-1',
          type: NotificationType.PAYMENT_CONFIRMED,
          title: 'Payment confirmed',
        }),
      }),
    );
    expect(jobsService.enqueueNotificationDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'in_app',
        recipientId: 'resident-1',
        metadata: expect.objectContaining({ notificationId: 'notification-2', paymentId: 'payment-1' }),
      }),
    );
  });
});
