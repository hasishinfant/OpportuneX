'use client';

import { Button } from '@/components/ui/Button';
import { usePWA } from '@/hooks/usePWA';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface InstallPromptProps {
  className?: string;
  variant?: 'banner' | 'modal' | 'button';
  onInstall?: () => void;
  onDismiss?: () => void;
}

export function InstallPrompt({
  className,
  variant = 'banner',
  onInstall,
  onDismiss,
}: InstallPromptProps) {
  const { isInstallable, installApp, isSupported, isClient } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Don't render on server or if not supported
  if (!isClient || !isSupported || !isInstallable || isDismissed) {
    return null;
  }

  const handleInstall = async () => {
    try {
      setIsInstalling(true);
      await installApp();
      onInstall?.();
    } catch (error) {
      console.error('Failed to install app:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (variant === 'button') {
    return (
      <Button
        onClick={handleInstall}
        disabled={isInstalling}
        className={cn('flex items-center space-x-2', className)}
      >
        <svg
          className='w-4 h-4'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
          />
        </svg>
        <span>{isInstalling ? 'Installing...' : 'Install App'}</span>
      </Button>
    );
  }

  if (variant === 'modal') {
    return (
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
        <div className='bg-white rounded-lg max-w-md w-full p-6 shadow-xl'>
          <div className='flex items-center mb-4'>
            <div className='w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-4'>
              <svg
                className='w-6 h-6 text-primary-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z'
                />
              </svg>
            </div>
            <div>
              <h3 className='text-lg font-semibold text-secondary-900'>
                Install OpportuneX
              </h3>
              <p className='text-sm text-secondary-600'>
                Get the full app experience
              </p>
            </div>
          </div>

          <div className='mb-6'>
            <p className='text-secondary-700 mb-4'>
              Install OpportuneX on your device for:
            </p>
            <ul className='space-y-2 text-sm text-secondary-600'>
              <li className='flex items-center'>
                <svg
                  className='w-4 h-4 text-green-500 mr-2'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                Faster loading and better performance
              </li>
              <li className='flex items-center'>
                <svg
                  className='w-4 h-4 text-green-500 mr-2'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                Work offline with cached content
              </li>
              <li className='flex items-center'>
                <svg
                  className='w-4 h-4 text-green-500 mr-2'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                Push notifications for new opportunities
              </li>
              <li className='flex items-center'>
                <svg
                  className='w-4 h-4 text-green-500 mr-2'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                Native app-like experience
              </li>
            </ul>
          </div>

          <div className='flex space-x-3'>
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              className='flex-1'
            >
              {isInstalling ? 'Installing...' : 'Install Now'}
            </Button>
            <Button
              onClick={handleDismiss}
              variant='outline'
              className='flex-1'
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default banner variant
  return (
    <div
      className={cn(
        'bg-gradient-to-r from-primary-500 to-primary-600 text-white p-4 shadow-lg',
        className
      )}
    >
      <div className='flex items-center justify-between max-w-4xl mx-auto'>
        <div className='flex items-center space-x-3'>
          <div className='w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center'>
            <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z'
                clipRule='evenodd'
              />
            </svg>
          </div>
          <div>
            <h4 className='font-semibold'>Install OpportuneX</h4>
            <p className='text-sm text-primary-100'>
              Get the app for a better experience
            </p>
          </div>
        </div>

        <div className='flex items-center space-x-2'>
          <Button
            onClick={handleInstall}
            disabled={isInstalling}
            variant='secondary'
            size='sm'
            className='bg-white text-primary-600 hover:bg-primary-50'
          >
            {isInstalling ? 'Installing...' : 'Install'}
          </Button>
          <button
            onClick={handleDismiss}
            className='p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors'
            aria-label='Dismiss install prompt'
          >
            <svg
              className='w-5 h-5'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
