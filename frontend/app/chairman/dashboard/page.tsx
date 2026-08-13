'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Calendar, CheckCircle2, MessageCircle, Pencil, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useChairmanDashboard } from '@/hooks/use-dashboard';
import { TopBar } from '@/components/common/top-bar';
import { StatCard } from '@/components/dashboard/stat-card';
import { MeetingBanner } from '@/components/meetings/meeting-banner';
import { SearchInput } from '@/components/forms/search-input';
import { FilterPills } from '@/components/common/filter-pills';
import { HouseholdRow } from '@/components/chairman/household-row';
import { levyService } from '@/services/levy-service';
import { reminderService } from '@/services/reminder-service';

const filters = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'rejected', label: 'Rejected' },
] as const;

export default function ChairmanDashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data, refetch, isLoading } = useChairmanDashboard();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const now = new Date();
  const [levyMonth, setLevyMonth] = useState(now.getMonth() + 1);
  const [levyYear, setLevyYear] = useState(now.getFullYear());
  const [levyAmount, setLevyAmount] = useState(5000);
  const [levyDueDate, setLevyDueDate] = useState('');
  const [reminderDaysBefore, setReminderDaysBefore] = useState(3);
  const [levySaving, setLevySaving] = useState(false);
  const [levyMessage, setLevyMessage] = useState<string | null>(null);

  if (user && user.role !== 'CHAIRMAN') router.replace('/unauthorized');

  const filteredHouseholds = useMemo(() => {
    const rows = data?.households ?? [];
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesFilter = filter === 'all' || row.currentStatus === filter;
      const haystack = [row.residentName, row.houseNumber, row.phone, row.email, row.referenceNumber ?? ''].join(' ').toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [data?.households, filter, query]);

  return (
    <main className="min-h-screen bg-paper pb-16">
      <TopBar title="Security Levy Tracker" subtitle={data?.currentLevyMonth ?? 'Current levy'} userName={user?.fullName ?? 'Chairman'} userRole="Chairman" onLogout={logout} />
      <section className="mx-auto w-full max-w-screen-2xl px-5 py-6 md:px-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Collected" value={data ? `NGN ${data.stats.totalCollected.toLocaleString()}` : '-'} subtext={data ? `of NGN ${data.stats.totalExpected.toLocaleString()} expected` : 'Loading'} icon={CheckCircle2} />
          <StatCard title="Collection rate" value={data ? `${data.stats.collectionPercentage}%` : '-'} subtext={data ? `${data.stats.totalPaidHouseholds} of ${data.stats.totalHouseholds} households` : 'Loading'} icon={Calendar} />
          <StatCard title="In progress" value={String(data?.stats.pendingConfirmationCount ?? '-')} subtext="awaiting Paystack" icon={Bell} />
          <StatCard title="Overdue" value={String(data?.stats.overdueHouseholdCount ?? '-')} subtext="not yet paid" icon={ShieldAlert} accent="danger" />
        </div>

        <div className="mt-5 glass-panel-strong rounded-[32px] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">Levy automation</div>
              <h2 className="mt-2 text-2xl font-heading text-ink">Create a levy cycle and resident invoices</h2>
              <p className="mt-2 max-w-2xl text-sm text-ink-soft">Creating a cycle closes the previous active cycle and generates one invoice for every household.</p>
            </div>
            {data?.currentLevy ? <div className="rounded-2xl bg-green-wash px-4 py-3 text-sm text-green-deep">Active: {data.currentLevyMonth} · {data.currentLevy.currency} {data.currentLevy.amount.toLocaleString()}</div> : null}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <label className="text-sm font-medium text-ink">Month<input type="number" min={1} max={12} value={levyMonth} onChange={(event) => setLevyMonth(Number(event.target.value))} className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3" /></label>
            <label className="text-sm font-medium text-ink">Year<input type="number" min={2020} value={levyYear} onChange={(event) => setLevyYear(Number(event.target.value))} className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3" /></label>
            <label className="text-sm font-medium text-ink">Amount (NGN)<input type="number" min={1} value={levyAmount} onChange={(event) => setLevyAmount(Number(event.target.value))} className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3" /></label>
            <label className="text-sm font-medium text-ink">Due date<input type="date" value={levyDueDate} onChange={(event) => setLevyDueDate(event.target.value)} className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3" /></label>
            <label className="text-sm font-medium text-ink">Remind days before<input type="number" min={0} max={30} value={reminderDaysBefore} onChange={(event) => setReminderDaysBefore(Number(event.target.value))} className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3" /></label>
          </div>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className={`text-sm ${levyMessage?.startsWith('Could') ? 'text-rust' : 'text-ink-soft'}`}>{levyMessage ?? 'Residents will see the generated invoice immediately after this cycle is created.'}</p>
            <button
              type="button"
              disabled={levySaving || !levyDueDate || levyAmount < 1}
              onClick={async () => {
                try {
                  setLevySaving(true);
                  setLevyMessage(null);
                  const result = await levyService.create({ month: levyMonth, year: levyYear, amount: levyAmount, dueDate: new Date(`${levyDueDate}T23:59:59`).toISOString(), currency: 'NGN', reminderDaysBefore });
                  setLevyMessage(`Cycle created with ${result.invoiceCount} resident invoices.`);
                  await refetch();
                } catch (error) {
                  setLevyMessage(error instanceof Error ? error.message : 'Could not create the levy cycle.');
                } finally {
                  setLevySaving(false);
                }
              }}
              className="rounded-full bg-green-deep px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {levySaving ? 'Creating invoices...' : 'Create levy cycle'}
            </button>
          </div>
        </div>

        <div className="mt-5 glass-panel-strong rounded-[32px] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3"><span className="rounded-2xl bg-green-wash p-3 text-green-deep"><MessageCircle className="h-5 w-5" /></span><div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">Household access</div><h2 className="mt-2 text-2xl font-heading text-ink">Manage WhatsApp login numbers</h2><p className="mt-2 max-w-2xl text-sm text-ink-soft">Open any household below to securely add, replace, or remove its WhatsApp verification number.</p></div></div>
            <a href="#household-ledger" className="rounded-full bg-green-deep px-5 py-3 text-center font-semibold text-white">Open household ledger</a>
          </div>
        </div>

        <div className="mt-5 rounded-panel border border-line bg-panel p-4 shadow-panel">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-heading">Upcoming meeting</h2>
            <Link href="/chairman/meetings" className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink">
              <Pencil className="h-4 w-4" /> Edit meetings
            </Link>
          </div>
          <MeetingBanner meeting={data?.upcomingMeeting} />
        </div>

        <div id="household-ledger" className="mt-5 scroll-mt-5 rounded-panel border border-line bg-panel p-5 shadow-panel">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-2xl font-heading">Household ledger</h2>
            <button onClick={async () => { await reminderService.remindBulkOverdue(); }} className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 font-semibold text-[#2A1C05]">
              <Bell className="h-4 w-4" /> Remind {data?.stats.overdueHouseholdCount ?? 0} overdue
            </button>
          </div>
          <div className="mt-4">
            <SearchInput value={query} onChange={setQuery} placeholder="Search by name, house, phone, email or reference" />
          </div>
          <div className="mt-4">
            <FilterPills items={filters as unknown as { value: string; label: string }[]} value={filter} onChange={setFilter} />
          </div>
          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="text-sm text-ink-soft">Loading ledger...</div>
            ) : filteredHouseholds.length ? (
              filteredHouseholds.map((household) => (
                <HouseholdRow key={household.householdId} household={household} onRemind={async (householdId) => { await reminderService.remindHousehold(householdId); }} />
              ))
            ) : (
              <div className="rounded-2xl bg-gold-wash px-4 py-6 text-sm text-ink-soft">No households match this search.</div>
            )}
          </div>
        </div>
      </section>

    </main>
  );
}
