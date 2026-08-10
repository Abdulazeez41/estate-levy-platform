import { Bell, CalendarDays, CheckCircle2, FileCheck2, MessageCircle, ReceiptText, ShieldCheck, Sparkles, Users2 } from 'lucide-react';

const orbitItems = [
  { icon: Bell, label: 'Reminders', tone: 'text-[#31563f]' },
  { icon: MessageCircle, label: 'Announcements', tone: 'text-[#7a5a12]' },
  { icon: FileCheck2, label: 'Proof uploads', tone: 'text-[#173c2d]' },
  { icon: CalendarDays, label: 'Meetings', tone: 'text-[#476d58]' },
];

export function CommunityScene() {
  return (
    <div className="scene-perspective relative mx-auto flex w-full max-w-[540px] items-center justify-center sm:max-w-[620px]">
      <div className="relative h-[500px] w-full sm:h-[560px]">
        <div className="scene-drift absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.2)_0%,rgba(28,91,61,0.08)_45%,transparent_72%)] blur-3xl" />
        <div className="scene-pulse absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/35 bg-white/25 blur-[1px]" />
        <div className="scene-orbit absolute inset-8 rounded-full border border-white/30 border-dashed" />
        <div className="scene-orbit absolute inset-[5.5rem] rounded-full border border-white/40" />
        <div className="scene-orbit absolute inset-[9rem] rounded-full border border-white/20 border-dashed" />

        <div className="scene-card scene-card-fast glass-panel-strong absolute left-2 top-10 w-44 rounded-[28px] p-4 sm:left-4 sm:top-14 sm:w-52">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-green-wash p-3 text-green-deep">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink">Estate reminder</div>
              <div className="text-xs text-ink-soft">Due in 2 days</div>
            </div>
          </div>
        </div>

        <div className="scene-card scene-card-slow glass-panel absolute right-2 top-20 w-52 rounded-[30px] p-4 sm:right-3 sm:top-24 sm:w-60">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-ink-soft">Community board</div>
              <div className="mt-1 text-sm font-semibold text-ink">Latest updates</div>
            </div>
            <ReceiptText className="h-5 w-5 text-green-deep" />
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-white/80 px-3 py-2 text-xs text-ink">Payment proof received</div>
            <div className="rounded-2xl bg-white/80 px-3 py-2 text-xs text-ink">Meeting notice sent</div>
            <div className="rounded-2xl bg-white/80 px-3 py-2 text-xs text-ink">Chairman account updated</div>
          </div>
        </div>

        <div className="scene-card scene-card-fast glass-panel-strong absolute left-3 bottom-16 w-56 rounded-[34px] p-4 sm:left-8 sm:bottom-18 sm:w-64 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gold-wash p-3 text-[#7a5a12]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink">Secure resident access</div>
              <div className="text-xs text-ink-soft">Private dashboards, receipts, reminders</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {orbitItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-white/50 bg-white/70 px-3 py-3">
                  <Icon className={`h-4 w-4 ${item.tone}`} />
                  <div className="mt-2 text-[11px] font-medium text-ink">{item.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="scene-card scene-card-slow absolute right-5 bottom-20 rounded-[32px] border border-white/50 bg-gradient-to-br from-white/95 to-white/55 p-4 shadow-[0_30px_60px_rgba(19,35,24,0.15)] sm:right-12 sm:bottom-24">
          <div className="flex items-end gap-3">
            <div className="h-[80px] w-[80px] rounded-[28px] bg-gradient-to-br from-green-deep to-green-deep-2 p-3 text-white shadow-lg sm:h-[88px] sm:w-[88px]">
              <div className="flex h-full flex-col justify-between">
                <div className="text-[10px] uppercase tracking-[0.14em] text-white/75">Community hub</div>
                <div className="text-sm font-semibold leading-tight">Reminders, proofs, approvals</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-20 rounded-full bg-green-wash" />
              <div className="h-3 w-28 rounded-full bg-gold-wash" />
              <div className="h-3 w-24 rounded-full bg-white/80" />
              <div className="h-3 w-16 rounded-full bg-[#CBDBCF]" />
            </div>
          </div>
        </div>

        <div className="scene-card scene-card-fast absolute right-8 top-44 rounded-[26px] border border-white/50 bg-white/70 px-4 py-3 shadow-lg backdrop-blur sm:right-[6.5rem] sm:top-52">
          <div className="flex items-center gap-3">
            <Users2 className="h-5 w-5 text-green-deep" />
            <div>
              <div className="text-xs uppercase tracking-[0.14em] text-ink-soft">Households synced</div>
              <div className="text-sm font-semibold text-ink">Live community network</div>
            </div>
          </div>
        </div>

        <div className="scene-card scene-card-slow absolute left-7 top-32 rounded-[26px] border border-white/50 bg-white/70 px-4 py-3 shadow-lg backdrop-blur sm:left-[4.5rem] sm:top-40">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-[#7a5a12]" />
            <div>
              <div className="text-xs uppercase tracking-[0.14em] text-ink-soft">3D community</div>
              <div className="text-sm font-semibold text-ink">Floating activity layers</div>
            </div>
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.42)_0%,rgba(28,91,61,0.12)_42%,transparent_72%)] blur-2xl" />
        <div className="scene-pulse absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 bg-white/40" />

        <div className="scene-card absolute bottom-6 left-1/2 flex w-[calc(100%-1.5rem)] max-w-[24rem] -translate-x-1/2 items-center gap-3 rounded-full border border-white/60 bg-white/75 px-4 py-3 shadow-[0_18px_45px_rgba(19,35,24,0.14)] sm:bottom-8 sm:w-auto sm:max-w-none sm:px-5">
          <CheckCircle2 className="h-5 w-5 text-green-deep" />
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-ink-soft">Estate operations</div>
            <div className="text-sm font-semibold text-ink">Reminders, receipts, reviews in motion</div>
          </div>
        </div>
      </div>
    </div>
  );
}
