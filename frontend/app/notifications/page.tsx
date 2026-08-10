'use client';

import { useMemo, useState } from 'react';
import { Archive, BellRing, Inbox } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/hooks/use-notifications';
import { TopBar } from '@/components/common/top-bar';
import { notificationService } from '@/services/notification-service';

export default function NotificationsPage() {
  const { user, logout } = useAuth();
  const { data, isLoading, refetch } = useNotifications();
  const [tab, setTab] = useState<'all' | 'unread' | 'archived'>('all');

  const filtered = useMemo(() => {
    const items = data ?? [];
    if (tab === 'unread') return items.filter((item) => !item.read && !item.archived);
    if (tab === 'archived') return items.filter((item) => item.archived);
    return items.filter((item) => !item.archived);
  }, [data, tab]);

  const unreadCount = (data ?? []).filter((item) => !item.read && !item.archived).length;
  const archivedCount = (data ?? []).filter((item) => item.archived).length;
  const activeCount = (data ?? []).filter((item) => !item.archived).length;
  const emptyState =
    tab === 'unread'
      ? {
          icon: BellRing,
          title: 'You are all caught up',
          description: 'No unread notifications are waiting right now. New payment confirmations, reminders, and account updates will show up here first.',
          actionLabel: 'View all',
          actionTab: 'all' as const,
        }
      : tab === 'archived'
        ? {
            icon: Archive,
            title: 'No archived items yet',
            description: 'Archived notifications will appear here when you move them out of the active feed.',
            actionLabel: 'View unread',
            actionTab: 'unread' as const,
          }
        : {
          icon: Inbox,
          title: 'Your notification feed is empty',
          description: 'Once reminders, payment updates, or account changes are sent, they will appear here with the newest items first.',
          actionLabel: 'View unread',
          actionTab: 'unread' as const,
        };
  const EmptyStateIcon = emptyState.icon;

  return (
    <main className="min-h-screen bg-paper pb-16">
      <TopBar title="Notifications" subtitle={`Unread ${unreadCount}`} userName={user?.fullName ?? 'User'} userRole={user?.role ?? 'Resident'} onLogout={logout} />
      <section className="mx-auto w-full max-w-screen-2xl px-5 py-6 md:px-8">
        <div className="rounded-panel border border-line bg-panel p-5 shadow-panel">
          <h1 className="text-3xl font-heading">Notification center</h1>
          <p className="mt-2 text-sm text-ink-soft">Track payment confirmations, reminder notices, and account updates in one place.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { key: 'all', label: `All (${activeCount})` },
              { key: 'unread', label: `Unread (${unreadCount})` },
              { key: 'archived', label: `Archived (${archivedCount})` },
            ].map((value) => (
              <button
                key={value.key}
                onClick={() => setTab(value.key as 'all' | 'unread' | 'archived')}
                className={`rounded-full px-4 py-2 text-sm font-medium ${tab === value.key ? 'bg-green-deep text-white' : 'border border-line bg-white text-ink'}`}
              >
                {value.label}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {isLoading ? (
              <div className="rounded-2xl bg-white px-4 py-6 text-sm text-ink-soft">Loading notifications...</div>
            ) : filtered.length ? (
              filtered.map((item) => (
                <div key={item.id} className={`rounded-2xl border border-line p-4 ${item.read ? 'bg-white' : 'bg-green-wash'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-ink">{item.title}</div>
                      <div className="mt-1 text-sm text-ink-soft">{item.message}</div>
                      <div className="mt-2 text-xs uppercase tracking-[0.08em] text-ink-soft">{new Date(item.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!item.read ? (
                        <button
                          onClick={async () => {
                            await notificationService.markRead(item.id);
                            await refetch();
                          }}
                          className="rounded-full border border-line px-3 py-1 text-xs"
                        >
                          Mark read
                        </button>
                      ) : null}
                      {!item.archived ? (
                        <button
                          onClick={async () => {
                            await notificationService.archive(item.id);
                            await refetch();
                          }}
                          className="rounded-full border border-line px-3 py-1 text-xs"
                        >
                          Archive
                        </button>
                      ) : null}
                      <button
                        onClick={async () => {
                          await notificationService.remove(item.id);
                          await refetch();
                        }}
                        className="rounded-full bg-rust px-3 py-1 text-xs text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-gold/40 bg-gold-wash px-5 py-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white/80 p-3 text-green-deep">
                      <EmptyStateIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-base font-semibold text-ink">{emptyState.title}</div>
                      <p className="mt-1 max-w-2xl text-sm text-ink-soft">{emptyState.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab(emptyState.actionTab)}
                    className="inline-flex items-center gap-2 rounded-full bg-green-deep px-5 py-3 font-semibold text-white"
                  >
                    {emptyState.actionLabel}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
