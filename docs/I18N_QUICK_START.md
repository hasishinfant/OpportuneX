# i18n Quick Start Guide

## For Developers: Adding Translations to Your Components

### 1. Server Components (Default in Next.js 15)

```typescript
import { useTranslations } from 'next-intl';

export default function MyPage() {
  const t = useTranslations('home');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>
    </div>
  );
}
```

### 2. Client Components

```typescript
'use client';

import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('search');

  return <button>{t('voiceSearchButton')}</button>;
}
```

### 3. Multiple Translation Namespaces

```typescript
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const tCommon = useTranslations('common');
  const tSearch = useTranslations('search');

  return (
    <div>
      <button>{tCommon('search')}</button>
      <input placeholder={tSearch('placeholder')} />
    </div>
  );
}
```

### 4. Get Current Locale

```typescript
'use client';

import { useLocale } from '@/hooks/useLocale';

export default function MyComponent() {
  const locale = useLocale();

  return <div>Current language: {locale}</div>;
}
```

### 5. Add Language Switcher

```typescript
'use client';

import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLocale } from '@/hooks/useLocale';

export default function Header() {
  const locale = useLocale();

  return (
    <header>
      <nav>
        {/* Your navigation items */}
      </nav>
      <LanguageSwitcher currentLocale={locale} />
    </header>
  );
}
```

## Available Translation Keys

### Common (`common.*`)

- `appName`, `search`, `filter`, `loading`, `error`, `success`
- `cancel`, `save`, `delete`, `edit`, `close`
- `back`, `next`, `previous`, `submit`, `reset`

### Header (`header.*`)

- `search`, `myRoadmaps`, `profile`, `signIn`, `getStarted`
- `analytics`, `social`

### Home (`home.*`)

- `title`, `subtitle`, `searchPlaceholder`
- `voiceSearch`, `featuredOpportunities`

### Search (`search.*`)

- `title`, `placeholder`, `voiceSearchButton`
- `filters`, `results`, `noResults`, `tryDifferentSearch`

### Filters (`filters.*`)

- `type`, `location`, `skillLevel`, `remote`
- `category`, `deadline`, `clearAll`, `apply`

### Opportunity (`opportunity.*`)

- `hackathon`, `internship`, `workshop`
- `deadline`, `location`, `remote`, `skillLevel`
- `beginner`, `intermediate`, `advanced`
- `viewDetails`, `apply`, `save`

### Profile (`profile.*`)

- `title`, `personalInfo`, `name`, `email`, `phone`
- `location`, `skills`, `interests`, `education`, `experience`
- `preferences`, `notifications`, `language`, `theme`, `saveChanges`

### Voice (`voice.*`)

- `listening`, `processing`, `speak`, `tryAgain`
- `error`, `permissionDenied`, `notSupported`

### Notifications (`notifications.*`)

- `title`, `markAllRead`, `noNotifications`
- `newOpportunity`, `deadlineReminder`, `applicationUpdate`

## Adding New Translation Keys

1. **Add to English file first** (`src/i18n/messages/en.json`):

```json
{
  "myFeature": {
    "newKey": "My new text"
  }
}
```

2. **Add to all other language files** (hi, es, fr, de, ta, te)

3. **Use in component**:

```typescript
const t = useTranslations('myFeature');
return <div>{t('newKey')}</div>;
```

## Voice Search with Language

```typescript
import { voiceService } from '@/lib/services/voice.service';
import { useLocale } from '@/hooks/useLocale';

export function VoiceSearchButton() {
  const locale = useLocale();

  const handleVoiceSearch = async (audioBlob: Blob) => {
    const result = await voiceService.processVoiceInput({
      audioData: audioBlob,
      language: locale, // Automatically uses current language
    });

    if (result.success) {
      console.log('Transcription:', result.data.transcription);
    }
  };

  return <button onClick={startRecording}>Voice Search</button>;
}
```

## Formatting Utilities

```typescript
import { i18nService } from '@/lib/services/i18n.service';
import { useLocale } from '@/hooks/useLocale';

export function MyComponent() {
  const locale = useLocale();

  // Format date
  const formattedDate = i18nService.formatDate(new Date(), locale);

  // Format number
  const formattedNumber = i18nService.formatNumber(1234567, locale);

  // Format currency
  const formattedPrice = i18nService.formatCurrency(5000, locale, 'INR');

  return (
    <div>
      <p>Date: {formattedDate}</p>
      <p>Number: {formattedNumber}</p>
      <p>Price: {formattedPrice}</p>
    </div>
  );
}
```

## Supported Languages

| Code | Language | Native Name |
| ---- | -------- | ----------- |
| en   | English  | English     |
| hi   | Hindi    | हिन्दी      |
| es   | Spanish  | Español     |
| fr   | French   | Français    |
| de   | German   | Deutsch     |
| ta   | Tamil    | தமிழ்       |
| te   | Telugu   | తెలుగు      |

## Testing Your Translations

1. **Switch language** using the language switcher
2. **Check all text** updates correctly
3. **Test voice search** in different languages
4. **Verify formatting** (dates, numbers, currency)

## Common Pitfalls

❌ **Don't hardcode strings**:

```typescript
return <button>Search < /button>; / / Wrong;
```

✅ **Use translations**:

```typescript
const t = useTranslations('common');
return <button>{t('search')}</button>; // Correct
```

❌ **Don't forget client directive**:

```typescript
// If using hooks like useLocale
export default function MyComponent() {
  // Wrong - will error
  const locale = useLocale();
}
```

✅ **Add 'use client'**:

```typescript
'use client';

export default function MyComponent() {
  // Correct
  const locale = useLocale();
}
```

## Need Help?

- 📖 Full documentation: `docs/I18N_IMPLEMENTATION.md`
- 🧪 Test examples: `src/test/i18n.service.test.ts`
- 🎨 Component example: `src/components/ui/LanguageSwitcher.tsx`
- 🔧 Service utilities: `src/lib/services/i18n.service.ts`
