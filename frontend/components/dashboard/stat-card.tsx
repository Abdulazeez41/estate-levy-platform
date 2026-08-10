import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  subtext: string;
  icon: LucideIcon;
  accent?: 'default' | 'danger';
}

export function StatCard({ title, value, subtext, icon: Icon, accent = 'default' }: StatCardProps) {
  return (
    <div className="rounded-[14px] border border-line bg-panel p-5 shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">{title}</div>
          <div className={cn('mt-3 font-mono text-[30px] font-semibold leading-none text-ink', accent === 'danger' && 'text-rust')}>{value}</div>
          <div className="mt-2 text-sm text-ink-soft">{subtext}</div>
        </div>
        <div className="rounded-2xl bg-green-wash p-3 text-green-deep">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
