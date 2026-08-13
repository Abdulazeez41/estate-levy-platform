import type { ResidentDashboardResponse } from '@/types';
import { StatusStamp } from '@/components/common/status-stamp';
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
      : lifecycleStatus === 'FAILED' || lifecycleStatus === 'REJECTED'
          ? 'The last Paystack attempt was not completed. You can safely try again.'
          : lifecycleStatus === 'PROCESSING'
            ? 'Paystack is verifying your payment. This page will reflect the confirmed result.'
            : 'Pay securely with Paystack to settle this levy.';

  const buttonLabel =
    lifecycleStatus === 'FAILED' || lifecycleStatus === 'REJECTED' ? 'Try Paystack again' : 'Pay with Paystack';
  const paymentInProgress = lifecycleStatus === 'PROCESSING';

  return (
    <div className="rounded-panel border border-line bg-panel p-6 shadow-panel">
      <div className="rounded-[18px] bg-white px-5 py-6">
        <StatusStamp status={dashboard.status} />
        <div className="mt-5 font-mono text-4xl font-semibold text-ink">NGN {dashboard.currentLevyAmount.toLocaleString()}</div>
        <div className="mt-2 text-sm text-ink-soft">
          {dashboard.currentLevyMonth} security levy - due by {new Date(dashboard.dueDate).toLocaleDateString()}
        </div>
        <p className="mt-3 text-sm text-ink-soft">{paymentMessage}</p>

        {dashboard.status !== 'paid' && !paymentInProgress ? (
          <button onClick={onOpenPayment} className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-deep px-5 py-3 font-semibold text-white">
            <PlusCircle className="h-5 w-5" />
            {buttonLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
