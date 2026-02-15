'use client';

import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is admin
    const checkAdminAccess = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();

        if (!data.success || !data.data?.isAdmin) {
          router.push('/');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Admin check error:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <LoadingSpinner size='lg' />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
          Analytics Dashboard
        </h1>
        <p className='mt-2 text-gray-600 dark:text-gray-400'>
          Comprehensive insights into platform performance and user engagement
        </p>
      </div>

      <AnalyticsDashboard />
    </div>
  );
}
