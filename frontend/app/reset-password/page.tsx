'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '@/services/auth-service';
import { resetPasswordSchema } from '@/validators/auth';

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [valid, setValid] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);
  const form = useForm({ resolver: zodResolver(resetPasswordSchema), defaultValues: { token, password: '', confirmPassword: '' } });

  useEffect(() => {
    form.setValue('token', token);
    if (!token) return;
    authService.validateResetToken(token).then((result) => setValid(result.valid)).catch(() => setValid(false));
  }, [form, token]);

  const onSubmit = form.handleSubmit(async (values) => {
    await authService.resetPassword({ token: values.token, password: values.password });
    setDone(true);
  });

  return (
    <div className="w-full max-w-lg rounded-[24px] border border-line bg-panel p-8 shadow-panel">
      <h1 className="text-3xl font-heading text-ink">Reset password</h1>
      <p className="mt-2 text-sm text-ink-soft">Use the reset token generated from the forgot-password flow.</p>
      {valid === false ? <div className="mt-4 rounded-2xl bg-rust-wash p-4 text-sm text-rust">This reset token is invalid or expired.</div> : null}
      {done ? <div className="mt-4 rounded-2xl bg-green-wash p-4 text-sm text-ink">Password updated successfully. You can now return to login.</div> : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input {...form.register('token')} className="w-full rounded-2xl border border-line bg-white px-4 py-3" placeholder="Reset token" />
          <input type="password" {...form.register('password')} className="w-full rounded-2xl border border-line bg-white px-4 py-3" placeholder="New password" />
          <input type="password" {...form.register('confirmPassword')} className="w-full rounded-2xl border border-line bg-white px-4 py-3" placeholder="Confirm password" />
          <button className="rounded-full bg-green-deep px-5 py-3 font-semibold text-white">Reset password</button>
        </form>
      )}
      <div className="mt-4 text-sm"><Link href="/login" className="text-green-deep underline underline-offset-4">Back to login</Link></div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <Suspense fallback={<div className="w-full max-w-lg rounded-[24px] border border-line bg-panel p-8 shadow-panel text-sm text-ink-soft">Loading reset session…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
