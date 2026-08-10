'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '@/services/auth-service';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/validators/auth';

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: 'adewale@greenview.test' } });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await authService.forgotPassword(values);
    setMessage(result.resetToken ? `Development reset token: ${result.resetToken}` : 'If the account exists, a reset link has been prepared.');
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-lg rounded-[24px] border border-line bg-panel p-8 shadow-panel">
        <h1 className="text-3xl font-heading text-ink">Forgot password</h1>
        <p className="mt-2 text-sm text-ink-soft">Request a password reset token for local development and testing.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input {...form.register('email')} className="w-full rounded-2xl border border-line bg-white px-4 py-3" placeholder="Email address" />
          <button className="rounded-full bg-green-deep px-5 py-3 font-semibold text-white">Request reset</button>
        </form>
        {message ? <div className="mt-4 rounded-2xl bg-green-wash p-4 text-sm text-ink">{message}</div> : null}
        <div className="mt-4 text-sm"><Link href="/login" className="text-green-deep underline underline-offset-4">Back to login</Link></div>
      </div>
    </main>
  );
}
