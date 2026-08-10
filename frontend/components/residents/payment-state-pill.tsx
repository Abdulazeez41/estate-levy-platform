import { AlertTriangle, CheckCircle2, Clock3, XCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type PaymentState = 'PENDING_PAYMENT' | 'MANUAL_TRANSFER_SUBMITTED' | 'AWAITING_CONFIRMATION' | 'CONFIRMED' | 'COMPLETED' | 'REJECTED' | 'FAILED' | 'CANCELLED';

const config: Record<PaymentState, { label: string; className: string; icon: LucideIcon }> = {
  PENDING_PAYMENT: { label: 'Pending', className: 'border-amber bg-amber-wash text-amber', icon: Clock3 },
  MANUAL_TRANSFER_SUBMITTED: { label: 'Pending', className: 'border-amber bg-amber-wash text-amber', icon: Clock3 },
  AWAITING_CONFIRMATION: { label: 'Pending', className: 'border-amber bg-amber-wash text-amber', icon: Clock3 },
  CONFIRMED: { label: 'Confirmed', className: 'border-green-bright bg-green-wash text-green-deep', icon: CheckCircle2 },
  COMPLETED: { label: 'Confirmed', className: 'border-green-bright bg-green-wash text-green-deep', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', className: 'border-rust bg-rust-wash text-rust', icon: XCircle },
  FAILED: { label: 'Failed', className: 'border-rust bg-rust-wash text-rust', icon: AlertTriangle },
  CANCELLED: { label: 'Cancelled', className: 'border-line bg-paper text-ink-soft', icon: XCircle },
};

export function PaymentStatePill({ status }: { status: PaymentState | string }) {
  const item = config[status as PaymentState];
  if (!item) {
    return <span className="inline-flex rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold text-ink-soft">{status}</span>;
  }

  const Icon = item.icon;
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold', item.className)}>
      <Icon className="h-3.5 w-3.5" />
      {item.label}
    </span>
  );
}
