import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HouseholdsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapStatus(status?: PaymentStatus | null) {
    if (status === PaymentStatus.COMPLETED || status === PaymentStatus.CONFIRMED) return 'paid';
    if (status === PaymentStatus.AWAITING_CONFIRMATION || status === PaymentStatus.MANUAL_TRANSFER_SUBMITTED || status === PaymentStatus.PENDING_PAYMENT) return 'pending';
    return 'overdue';
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
          currentStatus: this.mapStatus(latest?.status),
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
      currentStatus: this.mapStatus(latestPayment?.status),
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
