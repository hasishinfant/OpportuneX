'use client';

import { localeNames, locales, type Locale } from '@/i18n/config';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

interface LanguageSwitcherProps {
  currentLocale: Locale;
  className?: string;
}

export function LanguageSwitcher({
  currentLocale,
  className = '',
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: Locale) => {
    if (newLocale === currentLocale) {
      setIsOpen(false);
      return;
    }

    // Store language preference
    localStorage.setItem('preferredLocale', newLocale);
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;

    startTransition(() => {
      // Remove current locale from pathname if present
      const pathnameWithoutLocale =
        pathname.replace(`/${currentLocale}`, '') || '/';

      // Navigate to new locale
      router.push(`/${newLocale}${pathnameWithoutLocale}`);
      router.refresh();
    });

    setIsOpen(false);
  };

  const currentLanguage = localeNames[currentLocale];

  return (
    <div className={`relative ${className}`}>
      <button
        type='button'
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className='flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors disabled:opacity-50'
        aria-label='Select language'
        aria-expanded={isOpen}
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
            d='M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129'
          />
        </svg>
        <span className='hidden sm:inline'>{currentLanguage.nativeName}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M19 9l-7 7-7-7'
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className='fixed inset-0 z-10'
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className='absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-secondary-800 ring-1 ring-black ring-opacity-5 z-20'>
            <div className='py-1' role='menu'>
              {locales.map(locale => {
                const language = localeNames[locale];
                const isActive = locale === currentLocale;

                return (
                  <button
                    key={locale}
                    onClick={() => handleLanguageChange(locale)}
                    disabled={isPending}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors disabled:opacity-50 ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                        : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                    }`}
                    role='menuitem'
                  >
                    <div className='flex items-center justify-between'>
                      <div>
                        <div className='font-medium'>{language.nativeName}</div>
                        <div className='text-xs text-secondary-500 dark:text-secondary-400'>
                          {language.name}
                        </div>
                      </div>
                      {isActive && (
                        <svg
                          className='w-5 h-5 text-primary-600 dark:text-primary-400'
                          fill='currentColor'
                          viewBox='0 0 20 20'
                        >
                          <path
                            fillRule='evenodd'
                            d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                            clipRule='evenodd'
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
