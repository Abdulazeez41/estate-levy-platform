'use client';

import Link from 'next/link';
import { BellRing, Eye } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useHousehold } from '@/hooks/use-household';
import { TopBar } from '@/components/common/top-bar';
import { StatusStamp } from '@/components/common/status-stamp';
import { reminderService } from '@/services/reminder-service';
import { ReceiptPreviewModal } from '@/components/receipts/receipt-preview-modal';

export default function HouseholdDetailsPage() {
  const params = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const { data, isLoading, refetch } = useHousehold(params.id);
  const [receiptPreview, setReceiptPreview] = useState<{ title: string; subtitle?: string; receiptUrl: string } | null>(null);

  return (
    <main className="min-h-screen bg-paper pb-16">
      <TopBar title="Household details" subtitle={data?.houseNumber ?? 'Resident profile'} userName={user?.fullName ?? 'Chairman'} userRole="Chairman" onLogout={logout} />
      <section className="mx-auto w-full max-w-screen-2xl px-5 py-6 md:px-8">
        <div className="mb-4">
          <Link href="/chairman/dashboard" className="text-sm text-green-deep underline underline-offset-4">
            Back to dashboard
          </Link>
        </div>

        {isLoading || !data ? (
          <div className="rounded-panel border border-line bg-panel p-6 shadow-panel">Loading household details...</div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-panel border border-line bg-panel p-6 shadow-panel">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-heading text-ink">{data.resident.fullName}</h1>
                  <p className="mt-2 text-sm text-ink-soft">
                    {data.houseNumber} · {data.resident.phone} · {data.resident.email}
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">Outstanding balance: NGN {data.currentOutstandingBalance.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusStamp status={data.currentStatus} />
                  <button
                    onClick={async () => {
                      await reminderService.remindHousehold(data.householdId);
                      await refetch();
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-[#2A1C05]"
                  >
                    <BellRing className="h-4 w-4" />
                    Send reminder
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-panel border border-line bg-panel p-5 shadow-panel">
                <h2 className="text-2xl font-heading">Payment history</h2>
                <div className="mt-4 space-y-3">
                  {data.paymentHistory.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-line bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium text-ink">{item.monthLabel}</div>
                          <div className="mt-1 text-sm text-ink-soft">
                            {item.method} · {item.reference}
                          </div>
                          <div className="mt-1 text-xs text-ink-soft">
                            Submitted: {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : '—'} · Confirmed:{' '}
                            {item.confirmedAt ? new Date(item.confirmedAt).toLocaleString() : '—'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-lg">NGN {item.amount.toLocaleString()}</div>
                          <div className="text-sm text-ink-soft">{item.status}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.receiptUrl ? (
                          <>
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
                            <a href={item.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink">
                              Open receipt
                            </a>
                          </>
                        ) : null}
                      </div>
                      {item.rejectionReason ? <div className="mt-2 text-sm text-rust">Reason: {item.rejectionReason}</div> : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-panel border border-line bg-panel p-5 shadow-panel">
                  <h2 className="text-2xl font-heading">Uploaded receipts</h2>
                  <div className="mt-4 space-y-2">
                    {data.uploadedReceipts.length ? (
                      data.uploadedReceipts.map((receipt) => (
                        <div key={receipt.id} className="rounded-2xl border border-line bg-white px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium text-ink">{receipt.reference}</div>
                              <div className="mt-1 text-xs text-ink-soft">Receipt stored on the resident submission record</div>
                            </div>
                            {receipt.url ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setReceiptPreview({
                                    title: `Receipt ${receipt.reference}`,
                                    subtitle: 'Uploaded receipt',
                                    receiptUrl: receipt.url as string,
                                  })
                                }
                                className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-xs font-medium text-ink"
                              >
                                <Eye className="h-4 w-4" />
                                Preview
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-gold-wash px-4 py-6 text-sm text-ink-soft">No receipts uploaded.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-panel border border-line bg-panel p-5 shadow-panel">
                  <h2 className="text-2xl font-heading">Reminder history</h2>
                  <div className="mt-4 space-y-2">
                    {data.reminderHistory.length ? (
                      data.reminderHistory.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink-soft">
                          <div className="font-medium text-ink">{item.title}</div>
                          <div className="mt-1">{item.message}</div>
                          <div className="mt-1 text-xs">{new Date(item.createdAt).toLocaleString()}</div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-gold-wash px-4 py-6 text-sm text-ink-soft">No reminders sent yet.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-panel border border-line bg-panel p-5 shadow-panel">
                  <h2 className="text-2xl font-heading">Audit history</h2>
                  <div className="mt-4 space-y-2">
                    {data.auditHistory.length ? (
                      data.auditHistory.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink-soft">
                          {item.action} · {new Date(item.createdAt).toLocaleString()}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-gold-wash px-4 py-6 text-sm text-ink-soft">No audit history yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

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
