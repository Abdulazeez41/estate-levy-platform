import { Check, Download, FileText, X } from 'lucide-react';
import type { PendingApproval } from '@/types';

interface PendingPaymentCardProps {
  payment: PendingApproval;
  onApprove: (paymentId: string) => Promise<void>;
  onReject: (paymentId: string) => Promise<void>;
}

export function PendingPaymentCard({ payment, onApprove, onReject }: PendingPaymentCardProps) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-line bg-white px-4 py-4 md:flex-row md:items-center">
      <div className="min-w-0">
        <div className="text-lg font-medium text-ink">{payment.residentName}</div>
        <div className="mt-1 text-sm text-ink-soft">
          {payment.houseNumber} · submitted NGN {payment.amount.toLocaleString()} on {new Date(payment.submittedAt).toLocaleDateString()}
        </div>
        <div className="mt-1 text-xs uppercase tracking-[0.08em] text-ink-soft">
          {payment.paymentMethod} · {payment.reference}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {payment.receiptUrl ? <span className="inline-flex items-center gap-2 rounded-full bg-green-wash px-3 py-1 text-xs font-semibold text-green-deep"><FileText className="h-3.5 w-3.5" />Receipt attached</span> : null}
          {payment.receiptUrl ? (
            <>
              <a
                href={payment.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-ink"
              >
                <Download className="h-3.5 w-3.5" />
                Open receipt
              </a>
              <a href={payment.receiptUrl} download className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-ink">
                Download
              </a>
            </>
          ) : (
            <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-soft">No receipt URL provided</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => onApprove(payment.paymentId)} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-green-wash text-green-deep" aria-label="Approve payment">
          <Check className="h-5 w-5" />
        </button>
        <button onClick={() => onReject(payment.paymentId)} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-rust-wash text-rust" aria-label="Reject payment">
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
