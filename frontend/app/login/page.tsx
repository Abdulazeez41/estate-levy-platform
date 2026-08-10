'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { loginSchema, type LoginInput } from '@/validators/auth';
import { useAuth } from '@/hooks/use-auth';
import { CommunityScene } from '@/components/marketing/community-scene';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'chairman@greenview.test', password: 'Password123!' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setError(null);
      const user = await login(values);
      router.push(user.role === 'CHAIRMAN' ? '/chairman/dashboard' : '/resident/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in right now.');
    }
  });

  return (
    <main className="min-h-screen bg-paper px-4 py-6 text-ink md:px-6 md:py-10">
      <div className="mx-auto grid w-full max-w-screen-2xl gap-6 overflow-hidden rounded-[32px] border border-white/70 bg-white/55 shadow-[0_28px_80px_rgba(19,35,24,0.14)] backdrop-blur-2xl lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative overflow-hidden bg-gradient-to-b from-green-deep to-green-deep-2 p-6 text-white md:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(212,175,55,0.22),transparent_24%)]" />
          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold text-[#2A1C05]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="m-0 text-2xl font-bold font-heading">Greenview Estate</h1>
                <p className="mt-1 text-sm text-[#CBDBCF]">Community operations portal</p>
              </div>
            </div>

            <div className="mt-8 flex-1">
              <p className="max-w-md text-sm uppercase tracking-[0.2em] text-[#CBDBCF]">Reminders, payments, receipts, approvals</p>
              <h2 className="mt-4 max-w-lg text-4xl font-semibold font-heading leading-tight md:text-5xl">A private resident workspace for the whole estate.</h2>
              <p className="mt-4 max-w-lg text-base leading-7 text-[#E6F0E6]">
                Every flat gets its own login to view reminders, submit receipts, track payment status, and stay connected to estate updates.
              </p>
            </div>

            <div className="mt-8">
              <CommunityScene />
            </div>
          </div>
        </section>

        <section className="p-6 md:p-8 lg:p-10">
          <div className="mx-auto max-w-md">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
              <ShieldCheck className="h-4 w-4 text-green-deep" />
              Secure login
            </div>
            <h2 className="mt-6 text-3xl font-heading">Welcome back</h2>
            <p className="mt-2 text-sm text-ink-soft">Sign in to continue into the correct estate workspace.</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">Email</label>
                <input
                  {...form.register('email')}
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-gold"
                  placeholder="you@example.com"
                />
                {form.formState.errors.email ? <p className="mt-2 text-sm text-rust">{form.formState.errors.email.message}</p> : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Password</label>
                <input
                  type="password"
                  {...form.register('password')}
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-gold"
                  placeholder="Password123!"
                />
                {form.formState.errors.password ? <p className="mt-2 text-sm text-rust">{form.formState.errors.password.message}</p> : null}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 font-semibold text-[#2A1C05] transition hover:opacity-95 disabled:opacity-60"
              >
                {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Sign in
              </button>
            </form>

            {error ? (
              <div className="mt-4 rounded-[22px] border border-rust/20 bg-rust-wash px-4 py-3 text-sm text-rust">
                {error}
                <div className="mt-1 text-xs text-rust/80">If this is a local setup issue, make sure the backend is running on port 4000.</div>
              </div>
            ) : null}

            <div className="mt-4 text-sm">
              <Link href="/forgot-password" className="text-green-deep underline underline-offset-4">
                Forgot password
              </Link>
            </div>

            <div className="mt-8 rounded-[24px] bg-gold-wash p-4 text-sm text-ink-soft">
              <p className="font-medium text-ink">Seed accounts</p>
              <p className="mt-1">Chairman: chairman@greenview.test / Password123!</p>
              <p className="mt-1">Resident: adewale@greenview.test / Password123!</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
