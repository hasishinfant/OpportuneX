'use client';

import { usePWA } from '@/hooks/usePWA';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
  showWhenOnline?: boolean;
}

export function OfflineIndicator({
  className,
  showWhenOnline = false,
}: OfflineIndicatorProps) {
  const { isOnline, isClient } = usePWA();

  // Don't render on server
  if (!isClient) {
    return null;
  }

  if (isOnline && !showWhenOnline) {
    return null;
  }

  return (
    <div className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      isOnline ? 'bg-green-500' : 'bg-red-500',
      className
    )}>
      <div className="flex items-center justify-center py-2 px-4">
        <div className="flex items-center space-x-2 text-white text-sm font-medium">
          {isOnline ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              <span>Back online</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0 0L12 12m-6.364 6.364L12 12m6.364-6.364L12 12" />
              </svg>
              <span>You're offline - Some features may be limited</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}