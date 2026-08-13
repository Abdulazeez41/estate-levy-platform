import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, LevyStatus, PaymentStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private formatMonthLabel(month: number, year: number) {
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }

  private householdStatus(latestStatus: PaymentStatus | null, dueDate: Date) {
    if (latestStatus === PaymentStatus.CONFIRMED || latestStatus === PaymentStatus.COMPLETED) return 'paid';
    if (latestStatus === PaymentStatus.PROCESSING) return 'processing';
    if (latestStatus === PaymentStatus.REJECTED) return 'rejected';
    return dueDate.getTime() < Date.now() ? 'overdue' : 'pending';
  }

  private invoiceStatus(status: InvoiceStatus, dueDate: Date) {
    if (status === InvoiceStatus.CONFIRMED || status === InvoiceStatus.REFUNDED) return 'paid';
    if (status === InvoiceStatus.PROCESSING) return 'processing';
    if (status === InvoiceStatus.REJECTED) return 'rejected';
    if (status === InvoiceStatus.OVERDUE || dueDate.getTime() < Date.now()) return 'overdue';
    return 'pending';
  }

  private async getCurrentLevy() {
    const levy = await this.prisma.levy.findFirst({ where: { status: LevyStatus.ACTIVE }, orderBy: [{ year: 'desc' }, { month: 'desc' }] });
    if (!levy) throw new NotFoundException('No levy found');
    return levy;
  }

  async getChairmanDashboard() {
    const levy = await this.getCurrentLevy();
    const [households, upcomingMeeting] = await Promise.all([
      this.prisma.household.findMany({
        include: {
          resident: {
            include: {
              payments: {
                where: { levyId: levy.id },
                orderBy: [{ createdAt: 'desc' }],
              },
              invoices: { where: { levyId: levy.id }, take: 1 },
            },
          },
        },
        orderBy: { houseNumber: 'asc' },
      }),
      this.prisma.meeting.findFirst({ where: { meetingDate: { gte: new Date() } }, orderBy: { meetingDate: 'asc' } }),
    ]);

    const rows = households.map((household) => {
      const latestPayment = household.resident.payments[0] ?? null;
      const invoice = household.resident.invoices[0] ?? null;
      return {
        householdId: household.id,
        residentName: household.resident.fullName,
        houseNumber: household.houseNumber,
        phone: household.resident.phone,
        email: household.resident.email,
        currentStatus: invoice ? this.invoiceStatus(invoice.status, invoice.dueDate) : this.householdStatus(latestPayment?.status ?? null, levy.dueDate),
        invoiceId: invoice?.id,
        invoiceStatus: invoice?.status,
        referenceNumber: latestPayment?.reference ?? undefined,
      };
    });

    const totalHouseholds = rows.length;
    const totalPaidHouseholds = rows.filter((row) => row.currentStatus === 'paid').length;
    const pendingConfirmationCount = rows.filter((row) => row.currentStatus === 'processing').length;
    const overdueHouseholdCount = rows.filter((row) => row.currentStatus === 'overdue').length;
    const totalExpected = totalHouseholds * levy.amount;
    const totalCollected = totalPaidHouseholds * levy.amount;

    return {
      currentLevyMonth: this.formatMonthLabel(levy.month, levy.year),
      currentLevy: { id: levy.id, month: levy.month, year: levy.year, amount: levy.amount, currency: levy.currency, dueDate: levy.dueDate, reminderDaysBefore: levy.reminderDaysBefore },
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
      pendingApprovals: [],
      households: rows,
    };
  }

  async getResidentDashboard(userId: string) {
    const levy = await this.getCurrentLevy();
    const resident = await this.prisma.user.findFirst({
      where: { id: userId, role: Role.RESIDENT },
      include: {
        household: true,
        payments: {
          include: { levy: true, paymentReceipt: true },
          orderBy: { createdAt: 'desc' },
        },
        invoices: { where: { levyId: levy.id }, take: 1 },
      },
    });

    if (!resident || !resident.household) throw new NotFoundException('Resident not found');

    const latestCurrentPayment = resident.payments.find((payment) => payment.levyId === levy.id) ?? null;
    const currentInvoice = resident.invoices[0] ?? null;
    const upcomingMeeting = await this.prisma.meeting.findFirst({ where: { meetingDate: { gte: new Date() } }, orderBy: { meetingDate: 'asc' } });

    return {
      currentLevyId: levy.id,
      currentInvoiceId: currentInvoice?.id ?? null,
      residentId: resident.id,
      currentLevyMonth: this.formatMonthLabel(levy.month, levy.year),
      residentName: resident.fullName,
      houseNumber: resident.household.houseNumber,
      currentLevyAmount: levy.amount,
      currency: currentInvoice?.currency ?? levy.currency,
      invoiceStatus: currentInvoice?.status ?? null,
      status: currentInvoice ? this.invoiceStatus(currentInvoice.status, currentInvoice.dueDate) : this.householdStatus(latestCurrentPayment?.status ?? null, levy.dueDate),
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
        .filter((payment) => payment.status !== PaymentStatus.CANCELLED)
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
