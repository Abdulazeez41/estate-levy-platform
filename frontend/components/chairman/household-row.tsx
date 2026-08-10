import Link from 'next/link';
import type { ChairmanHouseholdRow } from '@/types';
import { StatusStamp } from '@/components/common/status-stamp';
import { Bell } from 'lucide-react';

function initials(name: string) {
  return name.replace(/^(Mr\.|Mrs\.|Dr\.|Engr\.|Alhaji|Chief)\s/, '').split(' ').map((word) => word[0]).slice(0, 2).join('');
}

export function HouseholdRow({ household, onRemind }: { household: ChairmanHouseholdRow; onRemind?: (householdId: string) => Promise<void> | void }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white px-4 py-4 transition hover:-translate-y-0.5 hover:shadow-panel md:flex-row md:items-center md:justify-between">
      <Link href={`/chairman/households/${household.householdId}`} className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-wash font-semibold text-green-deep">{initials(household.residentName)}</div>
        <div>
          <div className="text-base font-medium text-ink">{household.residentName}</div>
          <div className="mt-1 text-sm text-ink-soft">{household.houseNumber} · {household.phone}</div>
        </div>
      </Link>
      <div className="flex items-center gap-3">
        <StatusStamp status={household.currentStatus} />
        {household.currentStatus === 'overdue' ? (
          <button onClick={() => onRemind?.(household.householdId)} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-green-wash">
            <Bell className="h-4 w-4" /> Remind
          </button>
        ) : null}
      </div>
    </div>
  );
}
