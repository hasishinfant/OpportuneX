'use client';

import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useState } from 'react';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isClient } = useTheme();

  const navigation = [
    { name: 'Search', href: '/search' },
    { name: 'My Roadmaps', href: '/roadmap' },
    { name: 'Profile', href: '/profile' },
  ];

  // Use basic styling during SSR, theme-dependent styling only after hydration
  const headerClasses = isClient
    ? 'bg-white dark:bg-secondary-900 shadow-sm border-b border-secondary-200 dark:border-secondary-700'
    : 'bg-white shadow-sm border-b border-gray-200';

  const textClasses = isClient
    ? 'text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400'
    : 'text-gray-600 hover:text-blue-600';

  const logoTextClasses = isClient
    ? 'text-xl font-bold text-secondary-900 dark:text-white hidden sm:block'
    : 'text-xl font-bold text-gray-900 hidden sm:block';

  const mobileButtonClasses = isClient
    ? 'text-secondary-600 dark:text-secondary-300 hover:text-secondary-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 p-2'
    : 'text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 p-2';

  const mobileBorderClasses = isClient
    ? 'border-t border-secondary-200 dark:border-secondary-700'
    : 'border-t border-gray-200';

  return (
    <header className={cn(headerClasses, className)}>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between items-center h-16'>
          {/* Logo */}
          <div className='flex-shrink-0'>
            <Link href='/' className='flex items-center space-x-2'>
              <div className='w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center'>
                <span className='text-white font-bold text-lg'>O</span>
              </div>
              <span className={logoTextClasses}>OpportuneX</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className='hidden md:flex space-x-8'>
            {navigation.map(item => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  textClasses,
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors'
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className='hidden md:flex items-center space-x-2'>
            <ThemeToggle />
            <Button variant='outline' size='sm'>
              Sign In
            </Button>
            <Button size='sm'>Get Started</Button>
          </div>

          {/* Mobile menu button */}
          <div className='md:hidden flex items-center space-x-2'>
            <ThemeToggle size='sm' />
            <button
              type='button'
              className={mobileButtonClasses}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded='false'
            >
              <span className='sr-only'>Open main menu</span>
              {!isMobileMenuOpen ? (
                <svg
                  className='h-6 w-6'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4 6h16M4 12h16M4 18h16'
                  />
                </svg>
              ) : (
                <svg
                  className='h-6 w-6'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className='md:hidden'>
            <div
              className={cn(
                'px-2 pt-2 pb-3 space-y-1 sm:px-3',
                mobileBorderClasses
              )}
            >
              {navigation.map(item => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    textClasses,
                    'block px-3 py-2 rounded-md text-base font-medium transition-colors'
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className={cn('pt-4 pb-3', mobileBorderClasses)}>
                <div className='flex items-center px-3 space-x-3'>
                  <Button variant='outline' size='sm' className='flex-1'>
                    Sign In
                  </Button>
                  <Button size='sm' className='flex-1'>
                    Get Started
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
