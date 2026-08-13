import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, LevyStatus, NotificationType, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private readonly cooldownHours = 24;

  async processScheduledReminders(now = new Date()) {
    const levies = await this.prisma.levy.findMany({
      where: { status: LevyStatus.ACTIVE },
      include: { invoices: { include: { resident: true, household: true } } },
    });
    let dueSent = 0;
    let overdueSent = 0;
    for (const levy of levies) {
      const dueReminderAt = new Date(levy.dueDate.getTime() - levy.reminderDaysBefore * 86400000);
      for (const invoice of levy.invoices) {
        if (invoice.status === InvoiceStatus.CONFIRMED || invoice.status === InvoiceStatus.REFUNDED || invoice.status === InvoiceStatus.PENDING_REVIEW || invoice.status === InvoiceStatus.PROCESSING) continue;
        if (now.getTime() > invoice.dueDate.getTime()) {
          if (invoice.status !== InvoiceStatus.OVERDUE) await this.prisma.invoice.update({ where: { id: invoice.id }, data: { status: InvoiceStatus.OVERDUE } });
          const day = now.toISOString().slice(0, 10);
          await this.notificationsService.dispatchToUser({
            recipientId: invoice.residentId,
            type: NotificationType.PAYMENT_OVERDUE,
            title: 'Levy payment overdue',
            message: `${invoice.currency} ${invoice.amount.toLocaleString()} for ${invoice.household.houseNumber} is overdue. Please pay securely through Paystack.`,
            channels: ['in_app', 'sms', 'whatsapp', 'email'],
            metadata: { invoiceId: invoice.id, levyId: levy.id },
            dedupeKey: `invoice:${invoice.id}:overdue:${day}`,
          });
          overdueSent += 1;
        } else if (now.getTime() >= dueReminderAt.getTime()) {
          await this.notificationsService.dispatchToUser({
            recipientId: invoice.residentId,
            type: NotificationType.PAYMENT_DUE,
            title: 'Levy payment due soon',
            message: `${invoice.currency} ${invoice.amount.toLocaleString()} for ${invoice.household.houseNumber} is due on ${invoice.dueDate.toLocaleDateString()}.`,
            channels: ['in_app', 'sms', 'whatsapp', 'email'],
            metadata: { invoiceId: invoice.id, levyId: levy.id },
            dedupeKey: `invoice:${invoice.id}:due`,
          });
          dueSent += 1;
        }
      }
    }
    return { dueSent, overdueSent };
  }

  private async canSendReminder(recipientId: string) {
    const cutoff = new Date(Date.now() - this.cooldownHours * 60 * 60 * 1000);
    const recent = await this.prisma.notification.findFirst({
      where: {
        recipientId,
        type: NotificationType.REMINDER_SENT,
        createdAt: { gte: cutoff },
      },
    });
    return !recent;
  }

  async remindHousehold(householdId: string, chairmanId: string) {
    const household = await this.prisma.household.findUnique({
      where: { id: householdId },
      include: { resident: { include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } } } },
    });
    if (!household) throw new NotFoundException('Household not found');
    const latest = household.resident.payments[0];
    if (
      latest &&
      (latest.status === PaymentStatus.COMPLETED ||
        latest.status === PaymentStatus.CONFIRMED ||
        latest.status === PaymentStatus.AWAITING_CONFIRMATION ||
        latest.status === PaymentStatus.MANUAL_TRANSFER_SUBMITTED)
    ) {
      throw new BadRequestException('Only overdue households can receive reminders');
    }
    if (!(await this.canSendReminder(household.residentId))) {
      throw new BadRequestException('Reminder already sent within the configured interval');
    }

    await this.notificationsService.dispatchToUser({
      recipientId: household.residentId,
      type: NotificationType.REMINDER_SENT,
      title: 'Levy reminder',
      message: `This is a reminder to settle your current estate levy for ${household.houseNumber}. Please pay securely through Paystack.`,
      channels: ['in_app', 'whatsapp'],
      metadata: { householdId },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: chairmanId,
        action: 'REMINDER_SENT',
        entity: 'Household',
        entityId: householdId,
      },
    });
    return { success: true };
  }

  async remindAllOverdue(chairmanId: string) {
    const households = await this.prisma.household.findMany({
      include: { resident: { include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } } } },
    });
    let sent = 0;
    for (const household of households) {
      const latest = household.resident.payments[0];
      const overdue =
        !latest ||
        latest.status === PaymentStatus.REJECTED ||
        latest.status === PaymentStatus.PENDING_PAYMENT ||
        latest.status === PaymentStatus.FAILED ||
        latest.status === PaymentStatus.CANCELLED;
      if (!overdue) continue;
      if (!(await this.canSendReminder(household.residentId))) continue;
      await this.notificationsService.dispatchToUser({
        recipientId: household.residentId,
        type: NotificationType.REMINDER_SENT,
        title: 'Levy reminder',
        message: `This is a reminder to settle your current estate levy for ${household.houseNumber}.`,
        channels: ['in_app', 'sms', 'whatsapp'],
        metadata: { householdId: household.id },
      });
      sent += 1;
    }
    await this.prisma.auditLog.create({ data: { userId: chairmanId, action: 'BULK_REMINDER_SENT', entity: 'ReminderBatch', entityId: 'overdue-households', newValue: { sent } } });
    return { success: true, sent };
  }
}
