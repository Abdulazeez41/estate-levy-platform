import { InvoiceStatus, PaymentStatus } from '@prisma/client';
import { DashboardService } from '../src/dashboard/dashboard.service';

describe('Dashboard payment status mapping', () => {
  const service = new DashboardService({} as any) as any;
  const future = new Date(Date.now() + 86400000);
  const past = new Date(Date.now() - 86400000);

  it('separates payment due, processing, overdue, and paid states', () => {
    expect(service.invoiceStatus(InvoiceStatus.PENDING_PAYMENT, future)).toBe('pending');
    expect(service.invoiceStatus(InvoiceStatus.PROCESSING, future)).toBe('processing');
    expect(service.invoiceStatus(InvoiceStatus.PENDING_PAYMENT, past)).toBe('overdue');
    expect(service.invoiceStatus(InvoiceStatus.CONFIRMED, past)).toBe('paid');
    expect(service.householdStatus(PaymentStatus.PROCESSING, future)).toBe('processing');
  });
});
