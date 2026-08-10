import { MeetingsService } from '../src/meetings/meetings.service';

describe('MeetingsService', () => {
  it('creates meetings with attachments', async () => {
    const prisma: any = {
      meeting: { create: jest.fn().mockResolvedValue({ id: 'm1', title: 'Monthly EXCO Meeting', venue: 'Estate Hall', description: 'Agenda', meetingDate: new Date('2026-08-14T17:00:00.000Z'), status: 'UPCOMING', attachments: [{ id: 'a1', fileUrl: 'https://files.test/agenda.pdf', fileName: 'agenda.pdf', mimeType: 'application/pdf', size: 1000, createdAt: new Date() }] }) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'resident-1' }]) },
    };
    const notificationsService: any = { dispatchToUser: jest.fn().mockResolvedValue({}) };
    const service = new MeetingsService(prisma, notificationsService);

    const meeting = await service.create({ title: 'Monthly EXCO Meeting', venue: 'Estate Hall', meetingDate: '2026-08-14T17:00:00.000Z', description: 'Agenda', attachments: [{ fileUrl: 'https://files.test/agenda.pdf', fileName: 'agenda.pdf', mimeType: 'application/pdf', size: 1000 }] }, 'chairman-1');
    expect(meeting.attachments).toHaveLength(1);
    expect(notificationsService.dispatchToUser).toHaveBeenCalled();
  });
});
