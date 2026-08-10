import type { ResidentDashboardResponse } from '@/types';
import { StatusStamp } from '@/components/common/status-stamp';
import { PaymentStatePill } from '@/components/residents/payment-state-pill';
import { PlusCircle } from 'lucide-react';

interface PaymentStatusCardProps {
  dashboard?: ResidentDashboardResponse;
  isLoading: boolean;
  onOpenPayment: () => void;
}

export function PaymentStatusCard({ dashboard, isLoading, onOpenPayment }: PaymentStatusCardProps) {
  if (isLoading || !dashboard) {
    return <div className="rounded-panel border border-line bg-panel p-6 shadow-panel">Loading current levy...</div>;
  }

  const currentPayment = dashboard.currentPayment;
  const lifecycleStatus = currentPayment?.status ?? dashboard.status;
  const paymentMessage =
    dashboard.status === 'paid' || lifecycleStatus === 'CONFIRMED' || lifecycleStatus === 'COMPLETED'
      ? "You're all settled for this month. Thank you."
      : lifecycleStatus === 'REJECTED'
          ? 'Your last submission was rejected. You can resend your proof below.'
          : lifecycleStatus === 'MANUAL_TRANSFER_SUBMITTED' || lifecycleStatus === 'AWAITING_CONFIRMATION' || lifecycleStatus === 'PENDING_PAYMENT'
            ? 'Pay online or upload transfer proof to continue. Your submission is then reviewed or verified automatically.'
            : 'This levy is overdue. Please submit proof of payment as soon as possible.';

  const buttonLabel =
    lifecycleStatus === 'MANUAL_TRANSFER_SUBMITTED' || lifecycleStatus === 'AWAITING_CONFIRMATION'
      ? 'View submission'
      : lifecycleStatus === 'REJECTED'
        ? 'Resubmit proof'
        : 'Pay now';

  return (
    <div className="rounded-panel border border-line bg-panel p-6 shadow-panel">
      <div className="rounded-[18px] bg-white px-5 py-6">
        <StatusStamp status={dashboard.status} />
        <div className="mt-5 font-mono text-4xl font-semibold text-ink">NGN {dashboard.currentLevyAmount.toLocaleString()}</div>
        <div className="mt-2 text-sm text-ink-soft">
          {dashboard.currentLevyMonth} security levy - due by {new Date(dashboard.dueDate).toLocaleDateString()}
        </div>
        <p className="mt-3 text-sm text-ink-soft">{paymentMessage}</p>

        {currentPayment ? (
          <div className="mt-4 rounded-2xl border border-line bg-paper px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">Current submission</span>
              <PaymentStatePill status={currentPayment.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-ink-soft">Ref {currentPayment.reference}</span>
            </div>
            <div className="mt-2 grid gap-2 text-sm text-ink-soft sm:grid-cols-3">
              <div>
                <div className="font-medium text-ink">Method</div>
                <div>{currentPayment.paymentMethod}</div>
              </div>
              <div>
                <div className="font-medium text-ink">Submitted</div>
                <div>{currentPayment.submittedAt ? new Date(currentPayment.submittedAt).toLocaleDateString() : 'Not recorded'}</div>
              </div>
              <div>
                <div className="font-medium text-ink">Status</div>
                <div className="capitalize">{currentPayment.status.toLowerCase().replaceAll('_', ' ')}</div>
              </div>
            </div>
            {currentPayment.rejectionReason ? <p className="mt-3 rounded-xl bg-rust-wash px-3 py-2 text-sm text-rust">Rejected reason: {currentPayment.rejectionReason}</p> : null}
            {currentPayment.confirmedAt ? <p className="mt-3 rounded-xl bg-green-wash px-3 py-2 text-sm text-green-deep">Confirmed on {new Date(currentPayment.confirmedAt).toLocaleDateString()}</p> : null}
            {!currentPayment.confirmedAt && !currentPayment.rejectionReason ? <p className="mt-3 rounded-xl bg-amber-wash px-3 py-2 text-sm text-amber">The chairman has not completed the review yet.</p> : null}
          </div>
        ) : null}

        {dashboard.status !== 'paid' ? (
          <button onClick={onOpenPayment} className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-deep px-5 py-3 font-semibold text-white">
            <PlusCircle className="h-5 w-5" />
            {buttonLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
