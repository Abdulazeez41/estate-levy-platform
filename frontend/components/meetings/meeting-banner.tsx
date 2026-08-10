import { CalendarDays, MapPin } from 'lucide-react';
import type { MeetingSummary } from '@/types';

export function MeetingBanner({ meeting }: { meeting?: MeetingSummary | null }) {
  if (!meeting) {
    return (
      <div className="rounded-panel border border-line bg-panel p-5 shadow-panel">
        <div className="rounded-2xl bg-green-wash px-4 py-6 text-sm text-ink-soft">No upcoming estate meeting has been scheduled.</div>
      </div>
    );
  }

  const when = new Date(meeting.meetingDate);
  return (
    <div className="rounded-panel border border-line bg-panel p-5 shadow-panel">
      <div className="flex flex-col gap-4 rounded-[18px] bg-gradient-to-r from-green-deep to-green-deep-2 px-5 py-5 text-[#F2EFE2] md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/90 text-[#2A1C05]">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-heading">{meeting.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-[#CBDBCF]">
              <span>{when.toLocaleString()}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {meeting.venue}</span>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white/10 px-5 py-3 text-center">
          <div className="font-heading text-3xl leading-none">{meeting.countdownDays}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[#CBDBCF]">days to go</div>
        </div>
      </div>
    </div>
  );
}
