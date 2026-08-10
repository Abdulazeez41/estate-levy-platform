import { AlertTriangle, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const config = {
  paid: { label: 'Paid', icon: CheckCircle2, className: 'border-green-bright bg-green-wash text-green-deep' },
  pending: { label: 'Pending Confirm', icon: Clock3, className: 'border-amber bg-amber-wash text-amber' },
  overdue: { label: 'Overdue', icon: AlertTriangle, className: 'border-rust bg-rust-wash text-rust' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'border-rust bg-rust-wash text-rust' },
};

export function StatusStamp({ status }: { status: keyof typeof config }) {
  const item = config[status];
  const Icon = item.icon;
  return (
    <span className={cn('status-stamp inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm font-semibold', item.className, status)}>
      <Icon className="h-4 w-4" />
      {item.label}
    </span>
  );
}
