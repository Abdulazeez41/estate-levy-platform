'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Copy, FileText, UploadCloud } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import type { ResidentDashboardResponse } from '@/types';
import { paymentService } from '@/services/payment-service';
import { uploadService } from '@/services/upload-service';
import { isTestPaymentMode } from '@/lib/payment-mode';

function formatAmount(amount: number) {
  return `NGN ${amount.toLocaleString()}`;
}

const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_RECEIPT_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];

export function PaymentDialog({
  open,
  dashboard,
  onClose,
  onSuccess,
}: {
  open: boolean;
  dashboard?: ResidentDashboardResponse;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [mode, setMode] = useState<'manual' | 'online'>('online');
  const [amount, setAmount] = useState(0);
  const [transferDate, setTransferDate] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !dashboard) return;
    setAmount(dashboard.currentLevyAmount);
    setTransferDate(new Date().toISOString().slice(0, 10));
    setReference('');
    setNote('');
    setFile(null);
    setError(null);
    setSuccess(null);
    setMode('online');
  }, [open, dashboard]);

  if (!dashboard) return null;

  const receivingAccount = dashboard.receivingAccount;

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Copying the value failed. Please copy it manually.');
    }
  };

  const submitManual = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      if (!reference.trim()) throw new Error('Please enter the transfer reference or narration.');
      if (!file) throw new Error('Please attach your payment receipt before submitting.');
      if (!ACCEPTED_RECEIPT_TYPES.includes(file.type)) throw new Error('Please upload a PNG, JPG, or PDF receipt.');
      if (file.size > MAX_RECEIPT_SIZE_BYTES) throw new Error('Please upload a receipt smaller than 5 MB.');

      const uploaded = await uploadService.uploadReceipt(file);
      await paymentService.createManualSubmission({
        residentId: dashboard.residentId,
        levyId: dashboard.currentLevyId,
        paymentMethod: 'MANUAL_BANK',
        amount,
        transferDate,
        reference: reference.trim(),
        receiptUrl: uploaded.url,
        note: note.trim() || undefined,
      });
      await onSuccess();
      setSuccess('Submission received. The chairman will review your receipt shortly.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit payment');
    } finally {
      setLoading(false);
    }
  };

  const beginOnlinePayment = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await paymentService.initializePaystack({ residentId: dashboard.residentId, levyId: dashboard.currentLevyId });
      window.location.href = response.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not initialize Paystack');
      setLoading(false);
    }
  };

  return (
    <Modal open={open} title="Submit your payment" onClose={onClose}>
      <div className="space-y-5">
        {isTestPaymentMode() ? (
          <div className="inline-flex rounded-full border border-gold/40 bg-gold-wash px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber">
            Test mode enabled
          </div>
        ) : null}

        {success ? (
          <div className="rounded-[24px] border border-green-bright bg-green-wash p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 text-green-deep" />
              <div>
                <div className="text-lg font-semibold text-ink">Submission received</div>
                <p className="mt-1 text-sm text-ink-soft">{success}</p>
                <p className="mt-2 text-sm text-ink-soft">
                  Reference: <span className="font-mono font-semibold text-ink">{reference.trim()}</span>
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={onClose} className="rounded-full bg-green-deep px-5 py-3 font-semibold text-white">
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setSuccess(null);
                  setMode('manual');
                }}
                className="rounded-full border border-line bg-white px-5 py-3 font-semibold text-ink"
              >
                Submit another
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2 rounded-full bg-paper p-1">
              <button type="button" onClick={() => setMode('manual')} className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${mode === 'manual' ? 'bg-green-deep text-white' : 'text-ink'}`}>
                Manual transfer
              </button>
              <button type="button" onClick={() => setMode('online')} className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${mode === 'online' ? 'bg-green-deep text-white' : 'text-ink'}`}>
                Pay online
              </button>
            </div>

            {mode === 'online' ? (
              <div className="rounded-2xl border border-white/70 bg-gradient-to-br from-green-wash to-white p-4">
                <p className="text-sm text-ink-soft">
                  Pay online for immediate verification. If the gateway confirms the transfer, the dashboard updates automatically and the receipt is issued without waiting for manual review.
                </p>
                <button type="button" onClick={beginOnlinePayment} disabled={loading} className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-gold px-5 py-3 font-semibold text-[#2A1C05] sm:w-auto">
                  Continue to Paystack
                </button>
                <button type="button" onClick={() => setMode('manual')} className="mt-3 text-sm font-medium text-green-deep underline underline-offset-4">
                  Prefer bank transfer? Submit a receipt instead
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-line bg-paper p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-green-wash p-2 text-green-deep">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">Levy amount</p>
                      <p className="text-sm text-ink-soft">
                        {formatAmount(dashboard.currentLevyAmount)} for {dashboard.currentLevyMonth}
                      </p>
                    </div>
                  </div>
                </div>

                {receivingAccount ? (
                  <div className="rounded-2xl border border-line bg-white p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-ink-soft">Active estate account</div>
                        <div className="mt-2 text-base font-semibold text-ink">{receivingAccount.bankName}</div>
                        <div className="mt-1 text-sm text-ink-soft">{receivingAccount.accountName}</div>
                        <div className="mt-2 font-mono text-base font-semibold text-ink">{receivingAccount.accountNumber}</div>
                        {receivingAccount.instructions ? <p className="mt-2 text-sm text-ink-soft">{receivingAccount.instructions}</p> : null}
                      </div>
                      <button type="button" onClick={() => copyValue(receivingAccount.accountNumber)} className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-sm font-medium text-ink">
                        <Copy className="h-4 w-4" />
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-line bg-white p-4 text-sm text-ink-soft">The chairman has not set an active payment account yet.</div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Transfer amount</label>
                    <input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full rounded-2xl border border-line bg-white px-4 py-3" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Transfer date</label>
                    <input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} className="w-full rounded-2xl border border-line bg-white px-4 py-3" />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Transfer reference or narration</label>
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Example: GTB/123456789 or narration on your bank app"
                    className="w-full rounded-2xl border border-line bg-white px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Optional note</label>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-24 w-full rounded-2xl border border-line bg-white px-4 py-3" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Receipt attachment</label>
                  <div className="rounded-2xl border border-dashed border-line bg-white px-4 py-4">
                    <input type="file" accept="image/png,image/jpeg,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
                    <div className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
                      <UploadCloud className="h-4 w-4" />
                      <span>{file ? file.name : 'Attach a screenshot or PDF of the transfer receipt.'}</span>
                    </div>
                    <p className="mt-2 text-xs text-ink-soft">Accepted formats: PNG, JPG, or PDF. Maximum file size: 5 MB.</p>
                  </div>
                </div>

                <button type="button" onClick={submitManual} disabled={loading || !reference.trim() || !file} className="rounded-full bg-green-deep px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                  Submit for confirmation
                </button>
              </div>
            )}
          </>
        )}

        {error ? <p className="text-sm text-rust">{error}</p> : null}
      </div>
    </Modal>
  );
}
