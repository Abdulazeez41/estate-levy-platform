import { RemindersService } from '../src/reminders/reminders.service';

describe('RemindersService', () => {
  it('dispatches multi-channel reminder for overdue household', async () => {
    const prisma: any = {
      household: { findUnique: jest.fn().mockResolvedValue({ id: 'h1', houseNumber: 'A-12', residentId: 'r1', resident: { payments: [] } }) },
      notification: { findFirst: jest.fn().mockResolvedValue(null) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const notificationsService: any = { dispatchToUser: jest.fn().mockResolvedValue({}) };
    const service = new RemindersService(prisma, notificationsService);

    const result = await service.remindHousehold('h1', 'chairman-1');
    expect(result).toEqual({ success: true });
    expect(notificationsService.dispatchToUser).toHaveBeenCalledWith(expect.objectContaining({ channels: ['in_app', 'sms', 'whatsapp', 'email'] }));
  });
});
