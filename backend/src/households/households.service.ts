import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HouseholdsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapStatus(status?: PaymentStatus | null) {
    if (status === PaymentStatus.COMPLETED || status === PaymentStatus.CONFIRMED) return 'paid';
    if (status === PaymentStatus.PROCESSING) return 'processing';
    return 'overdue';
  }

  private normalizeWhatsAppNumber(value: string) {
    const compact = value.replace(/[\s()-]/g, '');
    return compact.startsWith('0') ? `+234${compact.slice(1)}` : compact;
  }

  async updateWhatsApp(householdId: string, value: string, chairmanId: string) {
    const household = await this.prisma.household.findUnique({ where: { id: householdId }, include: { resident: true } });
    if (!household) throw new NotFoundException('Household not found');

    const phone = this.normalizeWhatsAppNumber(value);
    const owner = await this.prisma.user.findFirst({ where: { phone, id: { not: household.residentId } }, select: { id: true } });
    if (owner) throw new ConflictException('This WhatsApp number is already assigned to another house.');

    const oldPhone = household.resident.phone;
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: household.residentId }, data: { phone } }),
      this.prisma.otpChallenge.updateMany({ where: { userId: household.residentId, consumedAt: null, invalidatedAt: null }, data: { invalidatedAt: new Date() } }),
      this.prisma.auditLog.create({
        data: {
          userId: chairmanId,
          action: oldPhone ? 'WHATSAPP_CONTACT_UPDATED' : 'WHATSAPP_CONTACT_ADDED',
          entity: 'User',
          entityId: household.residentId,
          oldValue: { phone: oldPhone },
          newValue: { phone, houseNumber: household.houseNumber },
        },
      }),
    ]);
    return { phone };
  }

  async deleteWhatsApp(householdId: string, chairmanId: string) {
    const household = await this.prisma.household.findUnique({ where: { id: householdId }, include: { resident: true } });
    if (!household) throw new NotFoundException('Household not found');

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: household.residentId }, data: { phone: null } }),
      this.prisma.otpChallenge.updateMany({ where: { userId: household.residentId, consumedAt: null, invalidatedAt: null }, data: { invalidatedAt: new Date() } }),
      this.prisma.refreshSession.updateMany({ where: { userId: household.residentId, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.prisma.auditLog.create({
        data: {
          userId: chairmanId,
          action: 'WHATSAPP_CONTACT_REMOVED',
          entity: 'User',
          entityId: household.residentId,
          oldValue: { phone: household.resident.phone },
          newValue: { phone: null, houseNumber: household.houseNumber },
        },
      }),
    ]);
    return { phone: null };
  }

  async findAll(query?: string, filter?: string) {
    const levy = await this.prisma.levy.findFirst({ orderBy: [{ year: 'desc' }, { month: 'desc' }] });
    if (!levy) return [];

    const households = await this.prisma.household.findMany({
      include: { resident: { include: { payments: { where: { levyId: levy.id }, orderBy: { createdAt: 'desc' }, take: 1 } } } },
      orderBy: { houseNumber: 'asc' },
    });

    const normalized = (query ?? '').trim().toLowerCase();
    return households
      .map((household) => {
        const latest = household.resident.payments[0];
        return {
          householdId: household.id,
          residentName: household.resident.fullName,
          houseNumber: household.houseNumber,
          phone: household.resident.phone,
          email: household.resident.email,
          currentStatus: latest ? this.mapStatus(latest.status) : levy.dueDate.getTime() < Date.now() ? 'overdue' : 'pending',
          referenceNumber: latest?.reference ?? null,
        };
      })
      .filter((row) => {
        const matchesFilter = !filter || filter === 'all' || row.currentStatus === filter;
        const matchesQuery = !normalized || [row.residentName, row.houseNumber, row.phone, row.email, row.referenceNumber ?? ''].join(' ').toLowerCase().includes(normalized);
        return matchesFilter && matchesQuery;
      });
  }

  async findOne(id: string) {
    const household = await this.prisma.household.findUnique({
      where: { id },
      include: {
        resident: { include: { payments: { include: { levy: true, paymentReceipt: true }, orderBy: { createdAt: 'desc' } }, notifications: { where: { deleted: false }, orderBy: { createdAt: 'desc' } }, auditLogs: { orderBy: { createdAt: 'desc' } } } },
      },
    });
    if (!household) throw new NotFoundException('Household not found');

    const latestPayment = household.resident.payments[0];
    const currentLevy = await this.prisma.levy.findFirst({ orderBy: [{ year: 'desc' }, { month: 'desc' }] });
    return {
      householdId: household.id,
      houseNumber: household.houseNumber,
      block: household.block,
      address: household.address,
      moveInDate: household.moveInDate,
      resident: {
        id: household.resident.id,
        fullName: household.resident.fullName,
        email: household.resident.email,
        phone: household.resident.phone,
      },
      currentStatus: latestPayment ? this.mapStatus(latestPayment.status) : currentLevy && currentLevy.dueDate.getTime() < Date.now() ? 'overdue' : 'pending',
      currentOutstandingBalance: latestPayment && (latestPayment.status === PaymentStatus.COMPLETED || latestPayment.status === PaymentStatus.CONFIRMED) ? 0 : currentLevy?.amount ?? 0,
      paymentHistory: household.resident.payments.map((payment) => ({
        id: payment.id,
        monthLabel: new Date(Date.UTC(payment.levy.year, payment.levy.month - 1, 1)).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
        amount: payment.amount,
        status: payment.status,
        method: payment.paymentMethod,
        reference: payment.reference,
        receiptUrl: payment.receiptUrl ?? payment.paymentReceipt?.fileUrl ?? null,
        rejectionReason: payment.rejectionReason,
        submittedAt: payment.submittedAt,
        confirmedAt: payment.confirmedAt,
      })),
      uploadedReceipts: household.resident.payments.filter((payment) => payment.receiptUrl || payment.paymentReceipt?.fileUrl).map((payment) => ({ id: payment.id, reference: payment.reference, url: payment.receiptUrl ?? payment.paymentReceipt?.fileUrl })),
      reminderHistory: household.resident.notifications.filter((notification) => notification.type === 'REMINDER_SENT'),
      auditHistory: household.resident.auditLogs,
    };
  }
}
