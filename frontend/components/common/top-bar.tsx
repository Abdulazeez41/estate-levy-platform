'use client';

import { Bell, LogOut, Wallet } from 'lucide-react';

interface TopBarProps {
  title: string;
  subtitle: string;
  userName: string;
  userRole: string;
  onLogout: () => void | Promise<void>;
}

export function TopBar({ title, subtitle, userName, userRole, onLogout }: TopBarProps) {
  return (
    <header className="bg-gradient-to-b from-green-deep to-green-deep-2 px-5 py-5 text-[#F2EFE2] md:px-8">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-gold text-[#2A1C05] shadow-inner">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="m-0 text-[22px] font-bold font-heading text-white">Greenview Estate</h1>
            <p className="mt-0.5 text-sm text-[#CBDBCF]">
              {title} - {subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="rounded-full border border-white/15 bg-white/10 p-3 text-[#DCE7DE]">
            <Bell className="h-4 w-4" />
          </button>
          <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-[#DCE7DE]">
            <span className="font-semibold text-white">{userName}</span> - {userRole}
          </div>
          <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-[#2A1C05]">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>
    </header>
  );
}
