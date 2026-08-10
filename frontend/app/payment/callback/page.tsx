'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, LoaderCircle, XCircle } from 'lucide-react';
import { paymentService } from '@/services/payment-service';
import { isTestPaymentMode } from '@/lib/payment-mode';

function PaymentCallbackContent() {
  const params = useSearchParams();
  const reference = params.get('reference') ?? params.get('trxref') ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    if (!reference) {
      setStatus('error');
      setMessage('Missing payment reference.');
      return;
    }

    paymentService
      .verifyPaystack(reference)
      .then(() => {
        setStatus('success');
        setMessage('Your payment has been verified successfully. The dashboard will update shortly.');
      })
      .catch(() => {
        setStatus('error');
        setMessage('Verification failed. Please contact the chairman if you were debited.');
      });
  }, [reference]);

  const success = status === 'success';
  const error = status === 'error';

  return (
    <div className="w-full max-w-xl rounded-[28px] border border-line bg-panel p-8 text-center shadow-panel">
      {isTestPaymentMode() ? (
        <div className="mx-auto mb-4 inline-flex rounded-full border border-gold/40 bg-gold-wash px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber">
          Test mode
        </div>
      ) : null}
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${success ? 'bg-green-wash text-green-deep' : error ? 'bg-rust-wash text-rust' : 'bg-gold-wash text-amber'}`}>
        {success ? <CheckCircle2 className="h-7 w-7" /> : error ? <XCircle className="h-7 w-7" /> : <LoaderCircle className="h-7 w-7 animate-spin" />}
      </div>
      <h1 className="mt-5 text-3xl font-heading text-ink">Paystack callback</h1>
      <p className={`mt-4 text-sm ${error ? 'text-rust' : 'text-ink-soft'}`}>{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/resident/dashboard" className="rounded-full bg-green-deep px-5 py-3 font-semibold text-white">
          Return to dashboard
        </Link>
        {success ? (
          <Link href="/notifications" className="rounded-full border border-line bg-white px-5 py-3 font-semibold text-ink">
            Check notifications
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <Suspense
        fallback={
          <div className="w-full max-w-xl rounded-[28px] border border-line bg-panel p-8 text-center text-sm text-ink-soft shadow-panel">
            Loading payment callback...
          </div>
        }
      >
        <PaymentCallbackContent />
      </Suspense>
    </main>
  );
}
