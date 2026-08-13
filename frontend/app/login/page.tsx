'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home, KeyRound, LoaderCircle, MessageCircle, ShieldCheck } from 'lucide-react';
import { CommunityScene } from '@/components/marketing/community-scene';
import { authService } from '@/services/auth-service';
import { useAuth } from '@/hooks/use-auth';

type OtpRequest = { challengeId: string; destinationMasked: string; channel?: 'WHATSAPP'; expiresInSeconds: number; debugCode?: string };

export default function LoginPage() {
  const router = useRouter();
  const { verifyOtp, isLoading } = useAuth();
  const [houseNumber, setHouseNumber] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ houseNumber: string }>>([]);
  const [challenge, setChallenge] = useState<OtpRequest | null>(null);
  const [code, setCode] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.requestIdleCallback(() => {
      router.prefetch('/chairman/dashboard');
      router.prefetch('/resident/dashboard');
    }, { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }, [router]);

  useEffect(() => {
    if (challenge || houseNumber.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      authService.searchHouses(houseNumber).then(setSuggestions).catch(() => setSuggestions([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [challenge, houseNumber]);

  const requestCode = async () => {
    if (houseNumber.trim().length < 2) return;
    try {
      setRequesting(true);
      setError(null);
      const result = await authService.requestOtp({ houseNumber: houseNumber.trim() });
      setChallenge(result);
      setCode(result.debugCode ?? '');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not send a verification code.');
    } finally {
      setRequesting(false);
    }
  };

  const completeLogin = async () => {
    if (!challenge || code.length !== 6) return;
    try {
      setError(null);
      const user = await verifyOtp({ challengeId: challenge.challengeId, code });
      router.push(user.role === 'CHAIRMAN' ? '/chairman/dashboard' : '/resident/dashboard');
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'The code could not be verified.');
    }
  };

  return (
    <main className="min-h-screen bg-paper px-4 py-6 text-ink md:px-6 md:py-10">
      <div className="mx-auto grid w-full max-w-screen-2xl gap-6 overflow-hidden rounded-[32px] border border-white/70 bg-white/55 shadow-[0_28px_80px_rgba(19,35,24,0.14)] backdrop-blur-2xl lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative overflow-hidden bg-gradient-to-b from-green-deep to-green-deep-2 p-6 text-white md:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(212,175,55,0.22),transparent_24%)]" />
          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold text-[#2A1C05]"><ShieldCheck className="h-6 w-6" /></div><div><h1 className="m-0 text-2xl font-bold font-heading">Greenview Estate</h1><p className="mt-1 text-sm text-[#CBDBCF]">One secure entrance for every household</p></div></div>
            <div className="mt-8 flex-1"><p className="max-w-md text-sm uppercase tracking-[0.2em] text-[#CBDBCF]">No passwords to remember</p><h2 className="mt-4 max-w-lg text-4xl font-semibold font-heading leading-tight md:text-5xl">Your house number is all you need to begin.</h2><p className="mt-4 max-w-lg text-base leading-7 text-[#E6F0E6]">Choose your house, receive a private six-digit code, and the platform opens the right workspace automatically.</p></div>
            <div className="mt-8"><CommunityScene /></div>
          </div>
        </section>

        <section className="flex items-center p-6 md:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-md">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft"><ShieldCheck className="h-4 w-4 text-green-deep" />Passwordless access</div>
            <h2 className="mt-6 text-3xl font-heading">{challenge ? 'Enter your code' : 'Find your household'}</h2>
            <p className="mt-2 text-sm text-ink-soft">{challenge ? `We sent a six-digit WhatsApp code to ${challenge.destinationMasked}.` : 'Residents and the chairman use this same secure entrance.'}</p>

            {!challenge ? (
              <div className="mt-8 space-y-5">
                <div className="relative">
                  <label className="mb-2 block text-sm font-medium">House number</label>
                  <div className="relative"><Home className="absolute left-4 top-3.5 h-5 w-5 text-ink-soft" /><input value={houseNumber} onChange={(event) => setHouseNumber(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void requestCode(); }} autoComplete="street-address" className="w-full rounded-2xl border border-line bg-white py-3 pl-12 pr-4 outline-none focus:border-gold" placeholder="Example: Block A, Flat 2" /></div>
                  {suggestions.length ? <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-white p-2 shadow-panel">{suggestions.map((item) => <button key={item.houseNumber} type="button" onClick={() => { setHouseNumber(item.houseNumber); setSuggestions([]); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-green-wash"><Home className="h-4 w-4 text-green-deep" />{item.houseNumber}</button>)}</div> : null}
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-green-bright/40 bg-green-wash px-4 py-3 text-sm text-ink-soft"><MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-deep" /><span>The private login code will be sent to the WhatsApp number registered for this house.</span></div>
                <button type="button" onClick={requestCode} disabled={requesting || houseNumber.trim().length < 2} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 font-semibold text-[#2A1C05] disabled:cursor-not-allowed disabled:opacity-60">{requesting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}Send code on WhatsApp</button>
              </div>
            ) : (
              <div className="mt-8 space-y-5">
                {challenge.debugCode ? <div className="rounded-2xl border border-gold/40 bg-gold-wash px-4 py-3 text-sm text-ink"><span className="font-semibold">Local development code:</span> <span className="font-mono text-lg">{challenge.debugCode}</span></div> : null}
                <div><label className="mb-2 block text-sm font-medium">Six-digit verification code</label><input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={(event) => { if (event.key === 'Enter') void completeLogin(); }} inputMode="numeric" autoComplete="one-time-code" autoFocus className="w-full rounded-2xl border border-line bg-white px-4 py-4 text-center font-mono text-3xl tracking-[0.35em] outline-none focus:border-gold" placeholder="000000" /></div>
                <button type="button" onClick={completeLogin} disabled={isLoading || code.length !== 6} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 font-semibold text-[#2A1C05] disabled:cursor-not-allowed disabled:opacity-60">{isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Verify and continue</button>
                <button type="button" onClick={() => { setChallenge(null); setCode(''); setError(null); }} className="inline-flex w-full items-center justify-center gap-2 text-sm font-medium text-green-deep"><ArrowLeft className="h-4 w-4" />Choose another house</button>
              </div>
            )}
            {error ? <div className="mt-4 rounded-[22px] border border-rust/20 bg-rust-wash px-4 py-3 text-sm text-rust">{error}</div> : null}
            <p className="mt-6 text-center text-xs leading-5 text-ink-soft">Codes expire after five minutes and can only be used once. Contact the chairman if your registered WhatsApp number has changed.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
