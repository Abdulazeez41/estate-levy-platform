'use client';

import { useState } from 'react';
import { CreditCard, LoaderCircle, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import type { ResidentDashboardResponse } from '@/types';
import { paymentService } from '@/services/payment-service';
import { isTestPaymentMode } from '@/lib/payment-mode';

export function PaymentDialog({
  open,
  dashboard,
  onClose,
}: {
  open: boolean;
  dashboard?: ResidentDashboardResponse;
  onClose: () => void;
  onSuccess?: () => Promise<void>;
  initialMode?: 'online';
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!dashboard) return null;

  const beginOnlinePayment = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await paymentService.initializePaystack({ residentId: dashboard.residentId, levyId: dashboard.currentLevyId });
      window.location.assign(response.authorizationUrl);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not initialize Paystack. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Modal open={open} title="Pay your levy securely" onClose={onClose}>
      <div className="space-y-5">
        {isTestPaymentMode() ? (
          <div className="inline-flex rounded-full border border-gold/40 bg-gold-wash px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber">
            Paystack test mode
          </div>
        ) : null}

        <div className="rounded-[24px] border border-line bg-gradient-to-br from-green-wash to-white p-5">
          <div className="flex items-start gap-4">
            <span className="rounded-2xl bg-green-deep p-3 text-white"><CreditCard className="h-5 w-5" /></span>
            <div>
              <h3 className="text-lg font-semibold text-ink">{dashboard.currentLevyMonth} levy</h3>
              <p className="mt-1 font-mono text-2xl font-semibold text-ink">NGN {dashboard.currentLevyAmount.toLocaleString()}</p>
              <p className="mt-3 text-sm leading-6 text-ink-soft">Paystack securely handles card, bank, USSD, and other available payment options. Your dashboard updates after the gateway verifies the payment.</p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl bg-paper px-4 py-3 text-sm text-ink-soft">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-deep" />
          <span>You will be redirected to Paystack. Greenview Estate does not store your card or banking credentials.</span>
        </div>

        <button type="button" onClick={beginOnlinePayment} disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 font-semibold text-[#2A1C05] disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          {loading ? 'Opening Paystack...' : 'Continue to Paystack'}
        </button>
        {error ? <p className="rounded-2xl bg-rust-wash px-4 py-3 text-sm text-rust">{error}</p> : null}
      </div>
    </Modal>
  );
}
