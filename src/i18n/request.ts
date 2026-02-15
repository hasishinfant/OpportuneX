// This file is currently disabled as next-intl has been removed
// TODO: Re-implement i18n functionality with a different library if needed

import { locales, type Locale } from './config';

// Placeholder function for future i18n implementation
export async function getRequestConfig({ locale }: { locale: string }) {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as Locale)) {
    return {
      locale: 'en',
      messages: (await import(`./messages/en.json`)).default,
    };
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
}

export default getRequestConfig;
