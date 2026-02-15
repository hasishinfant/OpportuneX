import { ThemeProvider } from '@/contexts/ThemeContext'; // ✅ ADD THIS
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OpportuneX - AI-Powered Opportunity Discovery',
  description:
    'Discover hackathons, internships, and workshops tailored for students from Tier 2 and Tier 3 cities in India',
  keywords: [
    'hackathons',
    'internships',
    'workshops',
    'students',
    'AI',
    'opportunities',
  ],
  authors: [{ name: 'OpportuneX Team' }],
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1f2937' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' className='scroll-smooth' suppressHydrationWarning>
      <body className={inter.className}>
        {/* ✅ Wrap entire app with ThemeProvider */}
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
