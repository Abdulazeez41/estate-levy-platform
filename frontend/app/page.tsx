import Link from 'next/link';
import { ArrowRight, BadgeCheck, BellRing, FileUp, LayoutDashboard, ShieldCheck, Wallet } from 'lucide-react';
import { CommunityScene } from '@/components/marketing/community-scene';

const highlights = [
  { icon: Wallet, title: 'Levy collection', text: 'Manual and online payment flows in one place.' },
  { icon: FileUp, title: 'Receipt uploads', text: 'Residents attach proof and track review status.' },
  { icon: BellRing, title: 'Community reminders', text: 'Meeting and payment reminders stay visible.' },
  { icon: LayoutDashboard, title: 'Resident dashboards', text: 'Every flat gets a private view of its records.' },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.6),transparent_28%),radial-gradient(circle_at_top_right,rgba(212,175,55,0.18),transparent_20%)]" />
      <section className="mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col gap-10 px-5 py-8 md:px-8 lg:flex-row lg:items-center lg:gap-16 lg:py-12">
        <div className="max-w-2xl flex-1">
          <div className="glass-panel inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-ink-soft">
            <BadgeCheck className="h-4 w-4 text-green-deep" />
            Greenview Estate platform
          </div>
          <h1 className="mt-6 text-5xl font-heading leading-[0.95] text-ink md:text-6xl lg:text-7xl">
            Community operations that feel calm, modern, and always on.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-ink-soft md:text-xl">
            One connected estate experience: reminders, payments, receipts, approvals, and resident access that stays private and easy to use.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-green-deep px-6 py-3 font-semibold text-white shadow-lg shadow-green-deep/25">
              Open resident portal
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/chairman/dashboard" className="glass-panel inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-ink">
              Chairman view
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="glass-panel-strong rounded-[28px] p-5">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-white/80 p-3 text-green-deep">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-ink">{item.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-ink-soft">{item.text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-1 justify-center lg:justify-end">
          <CommunityScene />
        </div>
      </section>

      <section className="mx-auto w-full max-w-screen-2xl px-5 pb-14 md:px-8">
        <div className="glass-panel-strong rounded-[36px] px-6 py-6 md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Designed for estates</div>
              <h2 className="mt-2 text-3xl font-heading text-ink">A single account, one dashboard per resident, one command view for the chairman.</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {['reminders', 'payments', 'receipts', 'meetings', 'notifications'].map((label) => (
                <span key={label} className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-medium text-ink">
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3 rounded-[28px] bg-white/70 px-4 py-4 text-sm text-ink-soft">
            <ShieldCheck className="h-5 w-5 text-green-deep" />
            Each resident gets a private login, while the chairman controls the estate payment account shown across all dashboards.
          </div>
        </div>
      </section>
    </main>
  );
}
