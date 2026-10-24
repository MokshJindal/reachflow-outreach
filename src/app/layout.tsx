import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ReachFlow AI - Bulk Email & WhatsApp Outreach Engine',
  description: 'Enterprise-grade cold outreach and bulk messaging with AI word variation and deliverability shield.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
