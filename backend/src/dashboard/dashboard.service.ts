import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private formatMonthLabel(month: number, year: number) {
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }

  private householdStatus(latestStatus: PaymentStatus | null, dueDate: Date) {
    if (latestStatus === PaymentStatus.CONFIRMED || latestStatus === PaymentStatus.COMPLETED) return 'paid';
    if (latestStatus === PaymentStatus.AWAITING_CONFIRMATION || latestStatus === PaymentStatus.MANUAL_TRANSFER_SUBMITTED || latestStatus === PaymentStatus.PENDING_PAYMENT) return 'pending';
    if (latestStatus === PaymentStatus.REJECTED) return 'rejected';
    return dueDate.getTime() < Date.now() ? 'overdue' : 'pending';
  }

  private async getCurrentLevy() {
    const levy = await this.prisma.levy.findFirst({ orderBy: [{ year: 'desc' }, { month: 'desc' }] });
    if (!levy) throw new NotFoundException('No levy found');
    return levy;
  }

  private async getReceivingAccount() {
    return this.prisma.receivingAccount.findFirst({ where: { isActive: true }, orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }] });
  }

  async getChairmanDashboard() {
    const [levy, receivingAccount] = await Promise.all([this.getCurrentLevy(), this.getReceivingAccount()]);
    const [households, upcomingMeeting, pendingApprovals] = await Promise.all([
      this.prisma.household.findMany({
        include: {
          resident: {
            include: {
              payments: {
                where: { levyId: levy.id },
                orderBy: [{ createdAt: 'desc' }],
              },
            },
          },
        },
        orderBy: { houseNumber: 'asc' },
      }),
      this.prisma.meeting.findFirst({ where: { meetingDate: { gte: new Date() } }, orderBy: { meetingDate: 'asc' } }),
      this.prisma.payment.findMany({
        where: { levyId: levy.id, status: { in: [PaymentStatus.AWAITING_CONFIRMATION, PaymentStatus.MANUAL_TRANSFER_SUBMITTED] } },
        include: { resident: { include: { household: true } }, paymentReceipt: true },
        orderBy: { submittedAt: 'desc' },
      }),
    ]);

    const rows = households.map((household) => {
      const latestPayment = household.resident.payments[0] ?? null;
      return {
        householdId: household.id,
        residentName: household.resident.fullName,
        houseNumber: household.houseNumber,
        phone: household.resident.phone,
        email: household.resident.email,
        currentStatus: this.householdStatus(latestPayment?.status ?? null, levy.dueDate),
        referenceNumber: latestPayment?.reference ?? undefined,
      };
    });

    const totalHouseholds = rows.length;
    const totalPaidHouseholds = rows.filter((row) => row.currentStatus === 'paid').length;
    const pendingConfirmationCount = rows.filter((row) => row.currentStatus === 'pending').length;
    const overdueHouseholdCount = rows.filter((row) => row.currentStatus === 'overdue').length;
    const totalExpected = totalHouseholds * levy.amount;
    const totalCollected = totalPaidHouseholds * levy.amount;

    return {
      currentLevyMonth: this.formatMonthLabel(levy.month, levy.year),
      receivingAccount,
      stats: {
        totalExpected,
        totalCollected,
        collectionPercentage: totalExpected ? Math.round((totalCollected / totalExpected) * 100) : 0,
        totalPaidHouseholds,
        totalHouseholds,
        pendingConfirmationCount,
        overdueHouseholdCount,
      },
      upcomingMeeting: upcomingMeeting
        ? {
            id: upcomingMeeting.id,
            title: upcomingMeeting.title,
            venue: upcomingMeeting.venue,
            meetingDate: upcomingMeeting.meetingDate,
            countdownDays: Math.max(0, Math.ceil((upcomingMeeting.meetingDate.getTime() - Date.now()) / 86400000)),
          }
        : null,
      pendingApprovals: pendingApprovals.map((payment) => ({
        paymentId: payment.id,
        residentName: payment.resident.fullName,
        houseNumber: payment.resident.household?.houseNumber ?? 'Unknown house',
        amount: payment.amount,
        submittedAt: payment.submittedAt,
        reference: payment.reference,
        paymentMethod: payment.paymentMethod,
        receiptUrl: payment.receiptUrl ?? payment.paymentReceipt?.fileUrl ?? null,
      })),
      households: rows,
    };
  }

  async getResidentDashboard(userId: string) {
    const [levy, receivingAccount] = await Promise.all([this.getCurrentLevy(), this.getReceivingAccount()]);
    const resident = await this.prisma.user.findFirst({
      where: { id: userId, role: Role.RESIDENT },
      include: {
        household: true,
        payments: {
          include: { levy: true, paymentReceipt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!resident || !resident.household) throw new NotFoundException('Resident not found');

    const latestCurrentPayment = resident.payments.find((payment) => payment.levyId === levy.id) ?? null;
    const upcomingMeeting = await this.prisma.meeting.findFirst({ where: { meetingDate: { gte: new Date() } }, orderBy: { meetingDate: 'asc' } });

    return {
      currentLevyId: levy.id,
      residentId: resident.id,
      currentLevyMonth: this.formatMonthLabel(levy.month, levy.year),
      receivingAccount,
      residentName: resident.fullName,
      houseNumber: resident.household.houseNumber,
      currentLevyAmount: levy.amount,
      status: this.householdStatus(latestCurrentPayment?.status ?? null, levy.dueDate),
      dueDate: levy.dueDate,
      submittedAt: latestCurrentPayment?.submittedAt ?? null,
      currentPayment: latestCurrentPayment
        ? {
            id: latestCurrentPayment.id,
            status: latestCurrentPayment.status,
            amount: latestCurrentPayment.amount,
            paymentMethod: latestCurrentPayment.paymentMethod,
            reference: latestCurrentPayment.reference,
            receiptUrl: latestCurrentPayment.receiptUrl ?? latestCurrentPayment.paymentReceipt?.fileUrl ?? null,
            submittedAt: latestCurrentPayment.submittedAt ?? null,
            confirmedAt: latestCurrentPayment.confirmedAt ?? null,
            rejectionReason: latestCurrentPayment.rejectionReason ?? null,
          }
        : null,
      upcomingMeeting: upcomingMeeting
        ? {
            id: upcomingMeeting.id,
            title: upcomingMeeting.title,
            venue: upcomingMeeting.venue,
            meetingDate: upcomingMeeting.meetingDate,
            countdownDays: Math.max(0, Math.ceil((upcomingMeeting.meetingDate.getTime() - Date.now()) / 86400000)),
          }
        : null,
      paymentHistory: resident.payments
        .filter((payment) => payment.status === PaymentStatus.CONFIRMED || payment.status === PaymentStatus.COMPLETED || payment.status === PaymentStatus.AWAITING_CONFIRMATION || payment.status === PaymentStatus.MANUAL_TRANSFER_SUBMITTED || payment.status === PaymentStatus.PENDING_PAYMENT || payment.status === PaymentStatus.REJECTED)
        .map((payment) => ({
          paymentId: payment.id,
          monthLabel: this.formatMonthLabel(payment.levy.month, payment.levy.year),
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          reference: payment.reference,
          status: payment.status,
          receiptUrl: payment.receiptUrl ?? payment.paymentReceipt?.fileUrl ?? null,
          submittedAt: payment.submittedAt ?? null,
          confirmedAt: payment.confirmedAt ?? null,
          rejectionReason: payment.rejectionReason ?? null,
        })),
    };
  }
}
