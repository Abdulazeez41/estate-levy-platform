'use client';

import Link from 'next/link';
import { BellRing, MessageCircle, Save, Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useHousehold } from '@/hooks/use-household';
import { TopBar } from '@/components/common/top-bar';
import { StatusStamp } from '@/components/common/status-stamp';
import { reminderService } from '@/services/reminder-service';
import { householdService } from '@/services/household-service';

export default function HouseholdDetailsPage() {
  const params = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const { data, isLoading, refetch } = useHousehold(params.id);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setWhatsappNumber(data?.resident.phone ?? ''), [data?.resident.phone]);

  const saveWhatsApp = async () => {
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      await householdService.updateWhatsApp(params.id, whatsappNumber.trim());
      await refetch();
      setMessage('WhatsApp login number saved successfully.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save the WhatsApp number.');
    } finally {
      setSaving(false);
    }
  };

  const removeWhatsApp = async () => {
    if (!window.confirm('Remove this WhatsApp number? The household will be signed out and unable to log in until a new number is saved.')) return;
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      await householdService.deleteWhatsApp(params.id);
      await refetch();
      setWhatsappNumber('');
      setMessage('WhatsApp number removed and existing trusted sessions revoked.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not remove the WhatsApp number.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-paper pb-16">
      <TopBar title="Household details" subtitle={data?.houseNumber ?? 'Resident profile'} userName={user?.fullName ?? 'Chairman'} userRole="Chairman" onLogout={logout} />
      <section className="mx-auto w-full max-w-screen-2xl px-5 py-6 md:px-8">
        <Link href="/chairman/dashboard" className="text-sm text-green-deep underline underline-offset-4">Back to dashboard</Link>

        {isLoading || !data ? (
          <div className="mt-4 rounded-panel border border-line bg-panel p-6 shadow-panel">Loading household details...</div>
        ) : (
          <div className="mt-4 space-y-5">
            <div className="rounded-panel border border-line bg-panel p-6 shadow-panel">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><h1 className="text-3xl font-heading text-ink">{data.resident.fullName}</h1><p className="mt-2 text-sm text-ink-soft">{data.houseNumber} · {data.resident.email}</p><p className="mt-2 text-sm text-ink-soft">Outstanding balance: NGN {data.currentOutstandingBalance.toLocaleString()}</p></div>
                <div className="flex items-center gap-3"><StatusStamp status={data.currentStatus} /><button onClick={async () => { await reminderService.remindHousehold(data.householdId); await refetch(); }} className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-[#2A1C05]"><BellRing className="h-4 w-4" />Send reminder</button></div>
              </div>
            </div>

            <div className="rounded-panel border border-line bg-panel p-5 shadow-panel">
              <div className="flex items-start gap-3"><span className="rounded-2xl bg-green-wash p-3 text-green-deep"><MessageCircle className="h-5 w-5" /></span><div><h2 className="text-2xl font-heading">WhatsApp login contact</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">Only the chairman can manage this number. Verification codes for {data.houseNumber} are sent here, and one number cannot be assigned to multiple houses.</p></div></div>
              <div className="mt-5 flex flex-col gap-3 md:flex-row">
                <input value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value)} inputMode="tel" className="min-w-0 flex-1 rounded-2xl border border-line bg-white px-4 py-3" placeholder="+2348031234567" />
                <button type="button" disabled={saving || !whatsappNumber.trim()} onClick={saveWhatsApp} className="inline-flex items-center justify-center gap-2 rounded-full bg-green-deep px-5 py-3 font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />Save number</button>
                {data.resident.phone ? <button type="button" disabled={saving} onClick={removeWhatsApp} className="inline-flex items-center justify-center gap-2 rounded-full border border-rust/30 bg-rust-wash px-5 py-3 font-semibold text-rust disabled:opacity-50"><Trash2 className="h-4 w-4" />Remove</button> : null}
              </div>
              <p className="mt-3 text-xs text-ink-soft">Accepted Nigerian formats: `08031234567` or `+2348031234567`. Numbers are stored in international format.</p>
              {message ? <p className="mt-3 rounded-2xl bg-green-wash px-4 py-3 text-sm text-green-deep">{message}</p> : null}
              {error ? <p className="mt-3 rounded-2xl bg-rust-wash px-4 py-3 text-sm text-rust">{error}</p> : null}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-panel border border-line bg-panel p-5 shadow-panel">
                <h2 className="text-2xl font-heading">Paystack payment history</h2>
                <div className="mt-4 space-y-3">
                  {data.paymentHistory.length ? data.paymentHistory.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-line bg-white p-4"><div className="flex items-center justify-between gap-3"><div><div className="font-medium text-ink">{item.monthLabel}</div><div className="mt-1 break-all font-mono text-xs text-ink-soft">{item.reference}</div></div><div className="text-right"><div className="font-mono text-lg">NGN {item.amount.toLocaleString()}</div><div className="text-sm text-ink-soft">{item.status}</div></div></div></div>
                  )) : <div className="rounded-2xl bg-gold-wash px-4 py-6 text-sm text-ink-soft">No Paystack payments recorded yet.</div>}
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-panel border border-line bg-panel p-5 shadow-panel"><h2 className="text-2xl font-heading">Reminder history</h2><div className="mt-4 space-y-2">{data.reminderHistory.length ? data.reminderHistory.map((item) => <div key={item.id} className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink-soft"><div className="font-medium text-ink">{item.title}</div><div className="mt-1">{item.message}</div><div className="mt-1 text-xs">{new Date(item.createdAt).toLocaleString()}</div></div>) : <div className="rounded-2xl bg-gold-wash px-4 py-6 text-sm text-ink-soft">No reminders sent yet.</div>}</div></div>
                <div className="rounded-panel border border-line bg-panel p-5 shadow-panel"><h2 className="text-2xl font-heading">Audit history</h2><div className="mt-4 space-y-2">{data.auditHistory.length ? data.auditHistory.map((item) => <div key={item.id} className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink-soft">{item.action} · {new Date(item.createdAt).toLocaleString()}</div>) : <div className="rounded-2xl bg-gold-wash px-4 py-6 text-sm text-ink-soft">No audit history yet.</div>}</div></div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
