import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { DeliveryChannel } from './channel-adapters.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
  ) {}

  listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { recipientId: userId, deleted: false },
      orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async markRead(userId: string, id: string) {
    const updated = await this.prisma.notification.updateMany({ where: { id, recipientId: userId }, data: { read: true } });
    if (!updated.count) throw new NotFoundException('Notification not found');
    return { success: true };
  }

  async archive(userId: string, id: string) {
    const updated = await this.prisma.notification.updateMany({ where: { id, recipientId: userId }, data: { archived: true } });
    if (!updated.count) throw new NotFoundException('Notification not found');
    return { success: true };
  }

  async remove(userId: string, id: string) {
    const updated = await this.prisma.notification.updateMany({ where: { id, recipientId: userId }, data: { deleted: true } });
    if (!updated.count) throw new NotFoundException('Notification not found');
    return { success: true };
  }

  async dispatchToUser(input: {
    recipientId: string;
    type: NotificationType;
    title: string;
    message: string;
    channels?: DeliveryChannel[];
    metadata?: Record<string, unknown>;
    dedupeKey?: string;
  }) {
    if (input.dedupeKey) {
      const existing = await this.prisma.notification.findUnique({ where: { dedupeKey: input.dedupeKey } });
      if (existing) return existing;
    }
    const notification = await this.prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        type: input.type,
        title: input.title,
        message: input.message,
        dedupeKey: input.dedupeKey,
      },
    });

    const recipient = await this.prisma.user.findUnique({ where: { id: input.recipientId } });
    const channels: DeliveryChannel[] = input.channels?.length ? input.channels : ['in_app'];

    await Promise.all(
      channels.map((channel) =>
        this.jobsService.enqueueNotificationDelivery({
          channel,
          recipientId: input.recipientId,
          recipientName: recipient?.fullName,
          email: recipient?.email,
          phone: recipient?.phone,
          title: input.title,
          message: input.message,
          metadata: { notificationId: notification.id, ...(input.metadata ?? {}) },
        }),
      ),
    );

    return notification;
  }
}
