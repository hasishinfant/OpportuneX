'use client';

import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { OfflineIndicator } from '@/components/pwa/OfflineIndicator';
import { SkipLinks } from '@/components/ui/SkipLink';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Footer } from './Footer';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
  className?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  containerized?: boolean;
  showInstallPrompt?: boolean;
  showOfflineIndicator?: boolean;
}

export function Layout({
  children,
  className,
  showHeader = true,
  showFooter = true,
  containerized = true,
  showInstallPrompt = true,
  showOfflineIndicator = true,
}: LayoutProps) {
  return (
    <div className='min-h-screen flex flex-col bg-background dark:bg-secondary-900'>
      {/* Skip Links for Accessibility */}
      <SkipLinks
        links={[
          { href: '#main-content', label: 'Skip to main content' },
          { href: '#navigation', label: 'Skip to navigation' },
          { href: '#footer', label: 'Skip to footer' },
        ]}
      />
      
      {/* Offline Indicator */}
      {showOfflineIndicator && <OfflineIndicator />}
      
      {/* Install Prompt */}
      {showInstallPrompt && <InstallPrompt variant="banner" />}
      
      {showHeader && (
        <div id="navigation">
          <Header />
        </div>
      )}

      <main id="main-content" className={cn('flex-1', className)} tabIndex={-1}>
        {containerized ? (
          <div className='container mx-auto px-4 sm:px-6 lg:px-8 py-6'>
            {children}
          </div>
        ) : (
          children
        )}
      </main>

      {showFooter && (
        <div id="footer">
          <Footer />
        </div>
      )}
    </div>
  );
}

// Specialized layout components for different page types
export function SearchLayout({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Layout className={cn('bg-secondary-50', className)} containerized={false}>
      {children}
    </Layout>
  );
}

export function DashboardLayout({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Layout className={cn('bg-secondary-50', className)}>
      <div className='max-w-7xl mx-auto'>{children}</div>
    </Layout>
  );
}

export function AuthLayout({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Layout
      className={cn(
        'bg-secondary-50 flex items-center justify-center',
        className
      )}
      showHeader={false}
      showFooter={false}
      containerized={false}
    >
      <div className='w-full max-w-md px-4'>{children}</div>
    </Layout>
  );
}
