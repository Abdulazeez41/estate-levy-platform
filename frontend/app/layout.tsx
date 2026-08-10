import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/components/providers';

export const metadata: Metadata = {
  title: 'Greenview Estate - Levy Tracker',
  description: 'Estate Levy Management Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
