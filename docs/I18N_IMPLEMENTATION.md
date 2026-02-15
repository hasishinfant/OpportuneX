# Multi-Language Support Implementation

## Overview

OpportuneX now supports 7 languages with comprehensive internationalization (i18n) capabilities:

- **English (en)** - English
- **Hindi (hi)** - हिन्दी
- **Spanish (es)** - Español
- **French (fr)** - Français
- **German (de)** - Deutsch
- **Tamil (ta)** - தமிழ்
- **Telugu (te)** - తెలుగు

## Architecture

### Core Components

1. **next-intl Integration**
   - Locale-based routing with middleware
   - Server and client-side translation support
   - Automatic locale detection from browser/cookies

2. **Translation Files**
   - Location: `src/i18n/messages/`
   - Format: JSON with nested keys
   - Coverage: All UI text, labels, and messages

3. **Language Switcher**
   - Component: `src/components/ui/LanguageSwitcher.tsx`
   - Persists preference in localStorage and cookies
   - Smooth transitions between languages

4. **Voice Search Support**
   - Updated `voice.service.ts` for all 7 languages
   - Language-specific speech-to-text processing
   - Mock implementations for development

5. **Database Support**
   - Added `preferredLanguage` field to User model
   - New `OpportunityTranslation` model for multilingual content
   - Supports storing opportunity details in multiple languages

## File Structure

```
src/
├── i18n/
│   ├── config.ts                    # Language configuration
│   ├── request.ts                   # Server-side i18n setup
│   └── messages/
│       ├── en.json                  # English translations
│       ├── hi.json                  # Hindi translations
│       ├── es.json                  # Spanish translations
│       ├── fr.json                  # French translations
│       ├── de.json                  # German translations
│       ├── ta.json                  # Tamil translations
│       └── te.json                  # Telugu translations
├── components/
│   └── ui/
│       └── LanguageSwitcher.tsx     # Language selection component
├── hooks/
│   └── useLocale.ts                 # Hook to get current locale
├── lib/
│   └── services/
│       ├── voice.service.ts         # Updated for 7 languages
│       └── i18n.service.ts          # Translation utilities
└── middleware.ts                    # Locale routing middleware
```

## Usage

### In Server Components

```typescript
import { useTranslations } from 'next-intl';

export default function ServerComponent() {
  const t = useTranslations('common');

  return <h1>{t('appName')}</h1>;
}
```

### In Client Components

```typescript
'use client';

import { useTranslations } from 'next-intl';

export default function ClientComponent() {
  const t = useTranslations('search');

  return <button>{t('voiceSearchButton')}</button>;
}
```

### Getting Current Locale

```typescript
'use client';

import { useLocale } from '@/hooks/useLocale';

export default function MyComponent() {
  const locale = useLocale();

  return <div>Current language: {locale}</div>;
}
```

### Using Language Switcher

```typescript
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLocale } from '@/hooks/useLocale';

export default function Header() {
  const locale = useLocale();

  return (
    <header>
      <LanguageSwitcher currentLocale={locale} />
    </header>
  );
}
```

## Translation Keys Structure

### Common Keys

- `common.appName` - Application name
- `common.search` - Search button/action
- `common.loading` - Loading state
- `common.error` - Error messages
- `common.save` - Save action

### Feature-Specific Keys

- `header.*` - Navigation items
- `home.*` - Homepage content
- `search.*` - Search interface
- `filters.*` - Filter options
- `opportunity.*` - Opportunity details
- `profile.*` - User profile
- `roadmap.*` - Roadmap features
- `voice.*` - Voice search
- `notifications.*` - Notification messages
- `footer.*` - Footer links

## Voice Search Support

All 7 languages are supported in voice search:

```typescript
import { voiceService } from '@/lib/services/voice.service';

// Process voice input in any supported language
const result = await voiceService.processVoiceInput({
  audioData: audioBlob,
  language: 'ta', // Tamil
});
```

### Language Codes for Voice APIs

- English: `en-US`
- Hindi: `hi-IN`
- Spanish: `es-ES`
- French: `fr-FR`
- German: `de-DE`
- Tamil: `ta-IN`
- Telugu: `te-IN`

## Database Schema Updates

### User Model

```prisma
model User {
  // ... other fields
  preferredLanguage String @default("en") @map("preferred_language") @db.VarChar(5)
}
```

### Opportunity Translations

```prisma
model OpportunityTranslation {
  id            String   @id @default(uuid())
  opportunityId String   @map("opportunity_id")
  language      String   @db.VarChar(5)
  title         String   @db.VarChar(500)
  description   String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([opportunityId, language])
}
```

## I18n Service Utilities

The `i18nService` provides helper functions:

```typescript
import { i18nService } from '@/lib/services/i18n.service';

// Detect language from text
const detected = await i18nService.detectLanguage('Hello world');

// Format dates
const formatted = i18nService.formatDate(new Date(), 'hi');

// Format numbers
const number = i18nService.formatNumber(1234567, 'de');

// Format currency
const price = i18nService.formatCurrency(5000, 'ta', 'INR');
```

## Adding New Languages

1. **Add locale to config**

   ```typescript
   // src/i18n/config.ts
   export const locales = [
     'en',
     'hi',
     'es',
     'fr',
     'de',
     'ta',
     'te',
     'new',
   ] as const;
   ```

2. **Create translation file**

   ```bash
   cp src/i18n/messages/en.json src/i18n/messages/new.json
   # Edit new.json with translations
   ```

3. **Update voice service**

   ```typescript
   // Add language code mapping in voice.service.ts
   const languageCodeMap = {
     // ... existing
     new: 'new-XX',
   };
   ```

4. **Add locale metadata**
   ```typescript
   // src/i18n/config.ts
   export const localeNames = {
     // ... existing
     new: { name: 'New Language', nativeName: 'Native Name' },
   };
   ```

## Testing

### Manual Testing

1. Change language using the language switcher
2. Verify all UI text updates
3. Test voice search in different languages
4. Check date/number formatting

### Automated Testing

```bash
# Run i18n-specific tests
npm run test -- i18n

# Check for missing translations
npm run i18n:check
```

## Performance Considerations

- Translation files are code-split by locale
- Only the active locale is loaded
- Locale preference is cached in localStorage
- Server-side rendering supports all locales

## Browser Support

- Modern browsers with Intl API support
- Fallback to English for unsupported locales
- Progressive enhancement for voice features

## Future Enhancements

1. **RTL Language Support**
   - Add Arabic, Hebrew, Urdu
   - Implement RTL layout switching

2. **Dynamic Translation Loading**
   - Load translations on-demand
   - Reduce initial bundle size

3. **Translation Management**
   - Integration with translation platforms (Crowdin, Lokalise)
   - Automated translation updates

4. **Content Translation**
   - Automatic translation of user-generated content
   - Integration with Google Translate API or DeepL

5. **Regional Variants**
   - Support for regional dialects (en-GB, en-IN, es-MX)
   - Location-based language suggestions

## Troubleshooting

### Language not switching

- Clear browser cache and cookies
- Check middleware configuration
- Verify locale is in the `locales` array

### Missing translations

- Check translation file exists for locale
- Verify key path is correct
- Use fallback to English if key missing

### Voice search not working

- Verify language code in voice service
- Check microphone permissions
- Test with mock provider first

## Resources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Intl API Reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
