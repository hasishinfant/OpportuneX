'use client';

import type { Locale } from '@/i18n/config';
import { useParams } from 'next/navigation';

export function useLocale(): Locale {
  const params = useParams();
  return (params?.locale as Locale) || 'en';
}
