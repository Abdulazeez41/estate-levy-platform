'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Calendar, CheckCircle2, Copy, Pencil, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useChairmanDashboard } from '@/hooks/use-dashboard';
import { TopBar } from '@/components/common/top-bar';
import { StatCard } from '@/components/dashboard/stat-card';
import { MeetingBanner } from '@/components/meetings/meeting-banner';
import { SearchInput } from '@/components/forms/search-input';
import { FilterPills } from '@/components/common/filter-pills';
import { HouseholdRow } from '@/components/chairman/household-row';
import { PendingPaymentCard } from '@/components/chairman/pending-payment-card';
import { paymentService } from '@/services/payment-service';
import { reminderService } from '@/services/reminder-service';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import type { PendingApproval } from '@/types';

const filters = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'rejected', label: 'Rejected' },
] as const;

export default function ChairmanDashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data, refetch, isLoading } = useChairmanDashboard();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [approveTarget, setApproveTarget] = useState<PendingApproval | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingApproval | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [instructions, setInstructions] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);

  if (user && user.role !== 'CHAIRMAN') router.replace('/unauthorized');

  useEffect(() => {
    if (!data?.receivingAccount) return;
    setBankName(data.receivingAccount.bankName);
    setAccountName(data.receivingAccount.accountName);
    setAccountNumber(data.receivingAccount.accountNumber);
    setInstructions(data.receivingAccount.instructions ?? '');
  }, [data?.receivingAccount]);

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
  const pendingApprovals = data?.pendingApprovals ?? [];
  const receivingAccountUpdatedAt = data?.receivingAccount?.updatedAt ? new Date(data.receivingAccount.updatedAt).toLocaleString() : null;

  return (
    <main className="min-h-screen bg-paper pb-16">
      <TopBar title="Security Levy Tracker" subtitle={data?.currentLevyMonth ?? 'Current levy'} userName={user?.fullName ?? 'Chairman'} userRole="Chairman" onLogout={logout} />
      <section className="mx-auto w-full max-w-screen-2xl px-5 py-6 md:px-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Collected" value={data ? `NGN ${data.stats.totalCollected.toLocaleString()}` : '-'} subtext={data ? `of NGN ${data.stats.totalExpected.toLocaleString()} expected` : 'Loading'} icon={CheckCircle2} />
          <StatCard title="Collection rate" value={data ? `${data.stats.collectionPercentage}%` : '-'} subtext={data ? `${data.stats.totalPaidHouseholds} of ${data.stats.totalHouseholds} households` : 'Loading'} icon={Calendar} />
          <StatCard title="Awaiting confirm" value={String(data?.stats.pendingConfirmationCount ?? '-')} subtext="submitted, needs review" icon={Bell} />
          <StatCard title="Overdue" value={String(data?.stats.overdueHouseholdCount ?? '-')} subtext="not yet paid" icon={ShieldAlert} accent="danger" />
        </div>

        <div className="mt-5 glass-panel-strong rounded-[32px] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">Estate payment account</div>
              <h2 className="mt-2 text-2xl font-heading text-ink">Set the account residents should pay into</h2>
              <p className="mt-2 max-w-2xl text-sm text-ink-soft">
                Update the bank name, account name, and account number here. The same details will appear on resident dashboards and in the payment form.
              </p>
              {receivingAccountUpdatedAt ? <p className="mt-3 text-xs uppercase tracking-[0.14em] text-ink-soft">Last updated {receivingAccountUpdatedAt}</p> : null}
            </div>
            {data?.receivingAccount ? (
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(data.receivingAccount?.accountNumber ?? '')}
                className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-medium text-ink"
              >
                <Copy className="h-4 w-4" />
                Copy current number
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-ink">Bank name</label>
                <input value={bankName} onChange={(event) => setBankName(event.target.value)} className="w-full rounded-2xl border border-line bg-white px-4 py-3" placeholder="e.g. GTBank" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-ink">Account name</label>
                <input value={accountName} onChange={(event) => setAccountName(event.target.value)} className="w-full rounded-2xl border border-line bg-white px-4 py-3" placeholder="e.g. Greenview Estate" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
              <div>
                <label className="mb-2 block text-sm font-medium text-ink">Account number</label>
                <input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} className="w-full rounded-2xl border border-line bg-white px-4 py-3" placeholder="0123456789" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-ink">Instructions</label>
                <input value={instructions} onChange={(event) => setInstructions(event.target.value)} className="w-full rounded-2xl border border-line bg-white px-4 py-3" placeholder="Optional note" />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-ink-soft">{accountMessage ?? 'This account will become the active payment destination for residents.'}</p>
            <button
              type="button"
              disabled={accountSaving || !bankName.trim() || !accountName.trim() || !accountNumber.trim()}
              onClick={async () => {
                try {
                  setAccountSaving(true);
                  setAccountMessage(null);
                  await paymentService.upsertReceivingAccount({
                    bankName: bankName.trim(),
                    accountName: accountName.trim(),
                    accountNumber: accountNumber.trim(),
                    instructions: instructions.trim() || undefined,
                  });
                  await refetch();
                  setAccountMessage('Payment account saved and published to resident dashboards.');
                } finally {
                  setAccountSaving(false);
                }
              }}
              className="inline-flex items-center gap-2 rounded-full bg-green-deep px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save payment account
            </button>
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

        <div className="mt-5 rounded-panel border border-line bg-panel p-5 shadow-panel">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-heading">
              Payments to confirm <span className="ml-2 rounded-full bg-green-wash px-3 py-1 text-sm font-body">{data?.pendingApprovals.length ?? 0}</span>
            </h2>
          </div>
          <div className="space-y-3">
            {pendingApprovals.length ? (
              pendingApprovals.map((payment) => (
                <PendingPaymentCard key={payment.paymentId} payment={payment} onApprove={async () => setApproveTarget(payment)} onReject={async () => setRejectTarget(payment)} />
              ))
            ) : (
              <div className="rounded-2xl bg-green-wash px-4 py-6 text-sm text-ink-soft">No pending approvals right now.</div>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-panel border border-line bg-panel p-5 shadow-panel">
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

      <ConfirmationDialog
        open={Boolean(approveTarget)}
        title="Approve payment"
        confirmLabel="Approve payment"
        onClose={() => setApproveTarget(null)}
        onConfirm={async () => {
          if (!approveTarget) return;
          await paymentService.approve(approveTarget.paymentId);
          setApproveTarget(null);
          await refetch();
        }}
      >
        <div className="rounded-2xl bg-green-wash p-4 text-sm text-ink">
          <p className="font-medium text-ink">{approveTarget?.residentName}</p>
          <p className="mt-1">
            {approveTarget?.houseNumber} - NGN {approveTarget?.amount.toLocaleString()} - {approveTarget?.reference}
          </p>
        </div>
      </ConfirmationDialog>

      <ConfirmationDialog
        open={Boolean(rejectTarget)}
        title="Reject payment"
        confirmLabel="Reject submission"
        confirmClassName="rounded-full bg-rust px-5 py-2.5 font-medium text-white"
        onClose={() => {
          setRejectTarget(null);
          setRejectReason('');
        }}
        onConfirm={async () => {
          if (!rejectTarget || !rejectReason.trim()) return;
          await paymentService.reject(rejectTarget.paymentId, { reason: rejectReason });
          setRejectTarget(null);
          setRejectReason('');
          await refetch();
        }}
      >
        <div className="space-y-3">
          <p className="text-sm text-ink-soft">Provide a rejection reason before returning the levy to pending action state.</p>
          <textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} className="min-h-24 w-full rounded-2xl border border-line bg-white px-4 py-3" placeholder="Incorrect amount, unreadable receipt, duplicate submission..." />
        </div>
      </ConfirmationDialog>
    </main>
  );
}
