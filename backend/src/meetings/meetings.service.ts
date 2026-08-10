import { Injectable, NotFoundException } from '@nestjs/common';
import { MeetingStatus, NotificationType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private mapMeeting(meeting: {
    id: string;
    title: string;
    venue: string;
    description: string | null;
    meetingDate: Date;
    status: MeetingStatus;
    attachments?: Array<{ id: string; fileUrl: string; fileName: string; mimeType: string; size: number; createdAt: Date }>;
  }) {
    return {
      id: meeting.id,
      title: meeting.title,
      venue: meeting.venue,
      description: meeting.description,
      meetingDate: meeting.meetingDate,
      status: meeting.status,
      countdownDays: Math.max(0, Math.ceil((meeting.meetingDate.getTime() - Date.now()) / 86400000)),
      attachments: meeting.attachments ?? [],
    };
  }

  async listAll() {
    const meetings = await this.prisma.meeting.findMany({
      include: { attachments: { orderBy: { createdAt: 'desc' } } },
      orderBy: { meetingDate: 'asc' },
    });
    return meetings.map((meeting) => this.mapMeeting(meeting));
  }

  async getUpcoming() {
    const meeting = await this.prisma.meeting.findFirst({
      where: { meetingDate: { gte: new Date() }, status: MeetingStatus.UPCOMING },
      include: { attachments: { orderBy: { createdAt: 'desc' } } },
      orderBy: { meetingDate: 'asc' },
    });
    return meeting ? this.mapMeeting(meeting) : null;
  }

  async create(dto: CreateMeetingDto, actorId: string) {
    const meeting = await this.prisma.meeting.create({
      data: {
        title: dto.title,
        venue: dto.venue,
        description: dto.description,
        meetingDate: new Date(dto.meetingDate),
        status: MeetingStatus.UPCOMING,
        attachments: dto.attachments?.length
          ? {
              create: dto.attachments.map((attachment) => ({
                fileUrl: attachment.fileUrl,
                fileName: attachment.fileName,
                mimeType: attachment.mimeType,
                size: attachment.size,
              })),
            }
          : undefined,
      },
      include: { attachments: true },
    });

    await this.notifyResidents(
      'Meeting created',
      `${meeting.title} has been scheduled at ${meeting.venue}. Review the agenda and attachments in your resident portal.`,
    );
    await this.prisma.auditLog.create({
      data: { userId: actorId, action: 'MEETING_CREATED', entity: 'Meeting', entityId: meeting.id, newValue: dto as unknown as object },
    });
    return this.mapMeeting(meeting);
  }

  async update(id: string, dto: UpdateMeetingDto, actorId: string) {
    const existing = await this.prisma.meeting.findUnique({ where: { id }, include: { attachments: true } });
    if (!existing) throw new NotFoundException('Meeting not found');

    const meeting = await this.prisma.meeting.update({
      where: { id },
      data: {
        title: dto.title ?? existing.title,
        venue: dto.venue ?? existing.venue,
        description: dto.description ?? existing.description,
        meetingDate: dto.meetingDate ? new Date(dto.meetingDate) : existing.meetingDate,
        attachments: dto.attachments
          ? {
              deleteMany: {},
              create: dto.attachments.map((attachment) => ({
                fileUrl: attachment.fileUrl,
                fileName: attachment.fileName,
                mimeType: attachment.mimeType,
                size: attachment.size,
              })),
            }
          : undefined,
      },
      include: { attachments: true },
    });

    await this.notifyResidents(
      'Meeting updated',
      `${meeting.title} has been updated. Please review the new details and attached files before the session.`,
    );
    await this.prisma.auditLog.create({
      data: { userId: actorId, action: 'MEETING_UPDATED', entity: 'Meeting', entityId: meeting.id, oldValue: existing as unknown as object, newValue: dto as unknown as object },
    });
    return this.mapMeeting(meeting);
  }

  async remove(id: string, actorId: string) {
    const existing = await this.prisma.meeting.findUnique({ where: { id }, include: { attachments: true } });
    if (!existing) throw new NotFoundException('Meeting not found');
    await this.prisma.meeting.delete({ where: { id } });
    await this.prisma.auditLog.create({ data: { userId: actorId, action: 'MEETING_DELETED', entity: 'Meeting', entityId: id, oldValue: existing as unknown as object } });
    return { success: true };
  }

  private async notifyResidents(title: string, message: string) {
    const residents = await this.prisma.user.findMany({ where: { role: Role.RESIDENT } });
    await Promise.all(
      residents.map((resident) =>
        this.notificationsService.dispatchToUser({
          recipientId: resident.id,
          type: NotificationType.MEETING_UPDATED,
          title,
          message,
          channels: ['in_app', 'email'],
        }),
      ),
    );
  }
}
