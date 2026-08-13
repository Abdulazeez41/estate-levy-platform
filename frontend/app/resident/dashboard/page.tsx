'use client';

import { useState } from 'react';
import { CheckCircle2, CreditCard, ReceiptText, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useResidentDashboard } from '@/hooks/use-dashboard';
import { TopBar } from '@/components/common/top-bar';
import { PaymentStatusCard } from '@/components/residents/payment-status-card';
import { PaymentStatePill } from '@/components/residents/payment-state-pill';
import { MeetingBanner } from '@/components/meetings/meeting-banner';
import { PaymentDialog } from '@/components/payments/payment-dialog';

export default function ResidentDashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data, isLoading, refetch } = useResidentDashboard(user?.id);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const paymentInProgress = ['PROCESSING'].includes(data?.currentPayment?.status ?? '');
  const paymentComplete = data?.status === 'paid';
  const paymentLocked = paymentComplete || paymentInProgress;

  if (user && user.role !== 'RESIDENT') router.replace('/unauthorized');

  return (
    <main className="min-h-screen bg-paper pb-16">
      <TopBar title="Security Levy Tracker" subtitle={data?.currentLevyMonth ?? 'Current levy'} userName={user?.fullName ?? 'Resident'} userRole="Resident" onLogout={logout} />
      <section className="mx-auto w-full max-w-screen-2xl px-5 py-6 md:px-8">
        <PaymentStatusCard dashboard={data} isLoading={isLoading} onOpenPayment={() => setPaymentOpen(true)} />

        <div className="mt-5 rounded-panel border border-line bg-panel p-5 shadow-panel">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">Secure online payment</div>
              <h2 className="mt-2 text-2xl font-heading text-ink">Pay automatically with Paystack</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
                {paymentComplete
                  ? 'This invoice is confirmed. Additional payments are disabled to prevent duplicate charges.'
                  : paymentInProgress
                    ? 'Paystack is verifying the current payment. The dashboard will update after confirmation.'
                    : 'Use card, bank, USSD, or another method offered by Paystack. No receipt upload or chairman approval is required.'}
              </p>
            </div>
            {paymentComplete ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-green-wash px-4 py-2 text-sm font-semibold text-green-deep"><CheckCircle2 className="h-4 w-4" />Invoice paid</span>
            ) : (
              <button type="button" disabled={paymentLocked || !data} onClick={() => setPaymentOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 font-semibold text-[#2A1C05] disabled:cursor-not-allowed disabled:opacity-55">
                <CreditCard className="h-4 w-4" />Pay with Paystack
              </button>
            )}
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-green-wash px-4 py-3 text-sm text-ink-soft">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-deep" />
            <span>Payment is marked confirmed only after the backend verifies the Paystack reference, amount, and currency.</span>
          </div>
        </div>

        <div className="mt-5"><MeetingBanner meeting={data?.upcomingMeeting} /></div>

        {data?.currentPayment ? (
          <div className="mt-5 rounded-panel border border-line bg-panel p-5 shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-2xl font-heading">Current payment</h2><p className="mt-1 text-sm text-ink-soft">Latest Paystack transaction for this levy cycle.</p></div>
              <PaymentStatePill status={data.currentPayment.status} />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-line bg-white px-4 py-4"><div className="text-sm text-ink-soft">Reference</div><div className="mt-1 break-all font-mono text-sm font-semibold text-ink">{data.currentPayment.reference}</div></div>
              <div className="rounded-2xl border border-line bg-white px-4 py-4"><div className="text-sm text-ink-soft">Method</div><div className="mt-1 text-sm font-semibold text-ink">Paystack</div></div>
              <div className="rounded-2xl border border-line bg-white px-4 py-4"><div className="text-sm text-ink-soft">Confirmed</div><div className="mt-1 text-sm font-semibold text-ink">{data.currentPayment.confirmedAt ? new Date(data.currentPayment.confirmedAt).toLocaleString() : 'Awaiting gateway confirmation'}</div></div>
            </div>
          </div>
        ) : null}

        <div className="mt-5 rounded-panel border border-line bg-panel p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-2xl font-heading">Payment history</h2><p className="mt-1 text-sm text-ink-soft">Verified Paystack transactions for this household.</p></div><ReceiptText className="h-5 w-5 text-green-deep" /></div>
          <div className="mt-4 space-y-3">
            {data?.paymentHistory?.length ? data.paymentHistory.map((item) => (
              <div key={item.paymentId} className="flex flex-col gap-3 rounded-2xl border border-line bg-white px-4 py-4 md:flex-row md:items-center md:justify-between">
                <div><div className="font-medium text-ink">{item.monthLabel}</div><div className="mt-1 break-all font-mono text-xs text-ink-soft">{item.reference}</div></div>
                <div className="flex items-center gap-4"><div className="font-mono text-lg font-semibold text-ink">NGN {item.amount.toLocaleString()}</div><PaymentStatePill status={item.status} /></div>
              </div>
            )) : (
              <div className="rounded-[24px] border border-dashed border-gold/40 bg-gold-wash px-5 py-6 text-sm text-ink-soft">No Paystack payments yet. Your verified transactions will appear here automatically.</div>
            )}
          </div>
        </div>
      </section>

      <PaymentDialog open={paymentOpen} dashboard={data} onClose={() => setPaymentOpen(false)} onSuccess={async () => { await refetch(); }} />
    </main>
  );
}
