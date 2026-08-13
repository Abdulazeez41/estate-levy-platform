import Link from 'next/link';
import { ArrowRight, BadgeCheck, BellRing, CreditCard, Home, MessageCircle, ShieldCheck } from 'lucide-react';
import { CommunityScene } from '@/components/marketing/community-scene';

const steps = [
  { icon: Home, title: 'Choose your house', text: 'Search for your flat from the estate directory.' },
  { icon: MessageCircle, title: 'Verify on WhatsApp', text: 'Receive a private six-digit, single-use login code.' },
  { icon: CreditCard, title: 'Pay through Paystack', text: 'Settle the levy securely and receive automatic confirmation.' },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-paper text-ink">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(255,255,255,0.85),transparent_28%),radial-gradient(circle_at_90%_8%,rgba(212,175,55,0.2),transparent_24%),linear-gradient(135deg,#edf4ec_0%,#f7f1df_48%,#e4efe8_100%)]" />
      <section className="mx-auto grid min-h-screen w-full max-w-screen-2xl gap-10 px-5 py-8 md:px-8 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:gap-16 lg:py-12">
        <div>
          <div className="glass-panel inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-ink-soft"><BadgeCheck className="h-4 w-4 text-green-deep" />Greenview Estate</div>
          <h1 className="mt-6 max-w-3xl text-5xl font-heading leading-[0.96] md:text-6xl lg:text-7xl">Your levy, reminders, and estate updates in one calm place.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-soft">Select your house, verify privately through WhatsApp, and pay securely with Paystack. Residents and the chairman share one simple entrance.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-green-deep px-6 py-3 font-semibold text-white shadow-lg shadow-green-deep/20">Enter with house number<ArrowRight className="h-4 w-4" /></Link>
            <span className="glass-panel inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-ink"><ShieldCheck className="h-4 w-4 text-green-deep" />No password required</span>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {steps.map((step, index) => { const Icon = step.icon; return <div key={step.title} className="glass-panel-strong rounded-[26px] p-5"><div className="flex items-center justify-between"><span className="rounded-2xl bg-white/80 p-3 text-green-deep"><Icon className="h-5 w-5" /></span><span className="font-mono text-xs text-ink-soft">0{index + 1}</span></div><h2 className="mt-4 text-lg font-semibold">{step.title}</h2><p className="mt-2 text-sm leading-6 text-ink-soft">{step.text}</p></div>; })}
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-[24px] border border-white/70 bg-white/55 px-5 py-4 text-sm text-ink-soft backdrop-blur-xl"><BellRing className="mt-0.5 h-5 w-5 shrink-0 text-green-deep" /><span>Payment status, due reminders, meeting notices, and verified receipts update automatically on your private dashboard.</span></div>
        </div>
        <div className="flex justify-center lg:justify-end"><CommunityScene /></div>
      </section>
    </main>
  );
}
