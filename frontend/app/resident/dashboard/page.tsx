'use client';

import { useState } from 'react';
import { Copy, Download, ReceiptText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useResidentDashboard } from '@/hooks/use-dashboard';
import { TopBar } from '@/components/common/top-bar';
import { PaymentStatusCard } from '@/components/residents/payment-status-card';
import { PaymentStatePill } from '@/components/residents/payment-state-pill';
import { MeetingBanner } from '@/components/meetings/meeting-banner';
import { PaymentDialog } from '@/components/payments/payment-dialog';
import { ArrowRight, Eye, UploadCloud } from 'lucide-react';
import { ReceiptPreviewModal } from '@/components/receipts/receipt-preview-modal';

function getPaymentStatusLabel(status: string) {
  switch (status) {
    case 'CONFIRMED':
    case 'COMPLETED':
      return 'Confirmed';
    case 'REJECTED':
      return 'Rejected';
    case 'PENDING_PAYMENT':
    case 'MANUAL_TRANSFER_SUBMITTED':
    case 'AWAITING_CONFIRMATION':
      return 'Pending';
    case 'FAILED':
      return 'Failed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

export default function ResidentDashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data, isLoading, refetch } = useResidentDashboard(user?.id);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<{ title: string; subtitle?: string; receiptUrl: string } | null>(null);
  const receivingAccountUpdatedAt = data?.receivingAccount?.updatedAt ? new Date(data.receivingAccount.updatedAt).toLocaleString() : null;

  if (user && user.role !== 'RESIDENT') router.replace('/unauthorized');

  return (
    <main className="min-h-screen bg-paper pb-16">
      <TopBar title="Security Levy Tracker" subtitle={data?.currentLevyMonth ?? 'Current levy'} userName={user?.fullName ?? 'Resident'} userRole="Resident" onLogout={logout} />
      <section className="mx-auto w-full max-w-screen-2xl px-5 py-6 md:px-8">
        <PaymentStatusCard dashboard={data} isLoading={isLoading} onOpenPayment={() => setPaymentOpen(true)} />

        {data?.receivingAccount ? (
          <div className="mt-5 glass-panel-strong rounded-[32px] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">Active estate payment account</div>
                <h2 className="mt-2 text-2xl font-heading text-ink">Transfer details approved by the chairman</h2>
                <p className="mt-2 max-w-2xl text-sm text-ink-soft">
                  Send your levy to this account, then attach the receipt in the payment form so the chairman can confirm it.
                </p>
                {receivingAccountUpdatedAt ? <p className="mt-3 text-xs uppercase tracking-[0.14em] text-ink-soft">Last updated {receivingAccountUpdatedAt}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(data.receivingAccount?.accountNumber ?? '')}
                className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-medium text-ink"
              >
                <Copy className="h-4 w-4" />
                Copy account number
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-[24px] bg-white/80 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-ink-soft">Bank</div>
                <div className="mt-2 text-base font-semibold text-ink">{data.receivingAccount.bankName}</div>
              </div>
              <div className="rounded-[24px] bg-white/80 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-ink-soft">Account name</div>
                <div className="mt-2 text-base font-semibold text-ink">{data.receivingAccount.accountName}</div>
              </div>
              <div className="rounded-[24px] bg-white/80 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-ink-soft">Account number</div>
                <div className="mt-2 font-mono text-base font-semibold text-ink">{data.receivingAccount.accountNumber}</div>
              </div>
            </div>
            {data.receivingAccount.instructions ? <p className="mt-4 rounded-[22px] bg-gold-wash px-4 py-3 text-sm text-ink">{data.receivingAccount.instructions}</p> : null}
          </div>
        ) : null}

        <div className="mt-5">
          <MeetingBanner meeting={data?.upcomingMeeting} />
        </div>

        {data?.currentPayment ? (
          <div className="mt-5 rounded-panel border border-line bg-panel p-5 shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-heading">Current submission</h2>
                <p className="mt-1 text-sm text-ink-soft">Track the latest transfer you sent for this levy cycle.</p>
              </div>
              <PaymentStatePill status={data.currentPayment.status} />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-line bg-white px-4 py-4">
                <div className="text-sm text-ink-soft">Transfer reference</div>
                <div className="mt-1 font-mono text-base font-semibold text-ink">{data.currentPayment.reference}</div>
                <div className="mt-3 text-sm text-ink-soft">Method</div>
                <div className="mt-1 text-sm font-medium text-ink">{data.currentPayment.paymentMethod}</div>
              </div>
              <div className="rounded-2xl border border-line bg-white px-4 py-4">
                <div className="text-sm text-ink-soft">Submission timeline</div>
                <div className="mt-1 text-sm font-medium text-ink">
                  Submitted {data.currentPayment.submittedAt ? new Date(data.currentPayment.submittedAt).toLocaleDateString() : 'not recorded'}
                </div>
                <div className="mt-2 text-sm text-ink-soft">
                  {data.currentPayment.confirmedAt ? `Confirmed ${new Date(data.currentPayment.confirmedAt).toLocaleDateString()}` : 'Waiting for chairman review'}
                </div>
              </div>
            </div>
            {data.currentPayment.rejectionReason ? <p className="mt-4 rounded-2xl bg-rust-wash px-4 py-3 text-sm text-rust">Rejection note: {data.currentPayment.rejectionReason}</p> : null}
            {data.currentPayment.receiptUrl ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                    onClick={() =>
                      setReceiptPreview({
                      title: `Receipt ${data.currentPayment!.reference}`,
                      subtitle: 'Current submission',
                      receiptUrl: data.currentPayment!.receiptUrl as string,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink"
                >
                  <Eye className="h-4 w-4" />
                  Preview receipt
                </button>
                <a href={data.currentPayment.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink">
                  <Download className="h-4 w-4" />
                  Open receipt
                </a>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 rounded-panel border border-line bg-panel p-5 shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-heading">Payment history</h2>
              <p className="mt-1 text-sm text-ink-soft">Every resident transfer and its review status are listed here.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gold-wash px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink">
              <ReceiptText className="h-4 w-4" />
              Levy archive
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {data?.paymentHistory?.length ? (
              data.paymentHistory.map((item) => (
                <div key={item.paymentId} className="rounded-2xl border border-line bg-white px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-ink">{item.monthLabel}</div>
                      <div className="mt-1 text-sm text-ink-soft">
                        {item.paymentMethod} - {item.reference}
                      </div>
                      {item.submittedAt ? <div className="mt-1 text-xs text-ink-soft">Submitted {new Date(item.submittedAt).toLocaleDateString()}</div> : null}
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-semibold text-ink">NGN {item.amount.toLocaleString()}</div>
                      <div className="mt-2 flex justify-end">
                        <PaymentStatePill status={item.status} />
                      </div>
                    </div>
                  </div>
                  {item.rejectionReason ? <p className="mt-3 rounded-xl bg-rust-wash px-3 py-2 text-sm text-rust">Rejected note: {item.rejectionReason}</p> : null}
                  {item.confirmedAt ? <p className="mt-3 rounded-xl bg-green-wash px-3 py-2 text-sm text-green-deep">Confirmed on {new Date(item.confirmedAt).toLocaleDateString()}</p> : null}
                  {item.receiptUrl ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setReceiptPreview({
                            title: `Receipt ${item.reference}`,
                            subtitle: item.monthLabel,
                            receiptUrl: item.receiptUrl as string,
                          })
                        }
                        className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink"
                      >
                        <Eye className="h-4 w-4" />
                        Preview receipt
                      </button>
                      <a href={item.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-green-deep underline underline-offset-4">
                        <Download className="h-4 w-4" />
                        Download receipt
                      </a>
                    </div>
                  ) : null}
                  {getPaymentStatusLabel(item.status) === 'Pending' ? <p className="mt-3 text-sm text-ink-soft">Pending submissions are reviewed by the chairman before confirmation.</p> : null}
                </div>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-gold/40 bg-gold-wash px-5 py-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white/80 p-3 text-green-deep">
                      <ReceiptText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-base font-semibold text-ink">No levy submissions yet</div>
                      <p className="mt-1 max-w-2xl text-sm text-ink-soft">
                        Your payment history will appear here after your first transfer. You can copy the estate account details above and submit your receipt from the payment form.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaymentOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-green-deep px-5 py-3 font-semibold text-white"
                  >
                    <UploadCloud className="h-4 w-4" />
                    Submit a receipt
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <PaymentDialog
        open={paymentOpen}
        dashboard={data}
        onClose={() => setPaymentOpen(false)}
        onSuccess={async () => {
          await refetch();
        }}
      />

      <ReceiptPreviewModal
        open={Boolean(receiptPreview)}
        title={receiptPreview?.title ?? 'Receipt preview'}
        subtitle={receiptPreview?.subtitle}
        receiptUrl={receiptPreview?.receiptUrl}
        onClose={() => setReceiptPreview(null)}
      />
    </main>
  );
}
