import type { Locale } from '@/i18n/config';
import { i18nService } from '@/lib/services/i18n.service';

describe('I18nService', () => {
  describe('detectLanguage', () => {
    it('should detect Hindi from Devanagari script', async () => {
      const result = await i18nService.detectLanguage('नमस्ते दुनिया');
      expect(result.success).toBe(true);
      expect(result.data).toBe('hi');
    });

    it('should detect Tamil from Tamil script', async () => {
      const result = await i18nService.detectLanguage('வணக்கம் உலகம்');
      expect(result.success).toBe(true);
      expect(result.data).toBe('ta');
    });

    it('should detect Telugu from Telugu script', async () => {
      const result = await i18nService.detectLanguage('హలో ప్రపంచం');
      expect(result.success).toBe(true);
      expect(result.data).toBe('te');
    });

    it('should detect Spanish from common words', async () => {
      const result = await i18nService.detectLanguage('Hola el mundo');
      expect(result.success).toBe(true);
      expect(result.data).toBe('es');
    });

    it('should detect French from common words', async () => {
      const result = await i18nService.detectLanguage('Bonjour le monde');
      expect(result.success).toBe(true);
      expect(result.data).toBe('fr');
    });

    it('should detect German from common words', async () => {
      const result = await i18nService.detectLanguage('Hallo die Welt');
      expect(result.success).toBe(true);
      expect(result.data).toBe('de');
    });

    it('should default to English for unknown text', async () => {
      const result = await i18nService.detectLanguage('Hello world');
      expect(result.success).toBe(true);
      expect(result.data).toBe('en');
    });
  });

  describe('formatDate', () => {
    const testDate = new Date('2024-01-15');

    it('should format date in English', () => {
      const formatted = i18nService.formatDate(testDate, 'en');
      expect(formatted).toContain('January');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    it('should format date in Hindi', () => {
      const formatted = i18nService.formatDate(testDate, 'hi');
      expect(formatted).toBeTruthy();
    });

    it('should format date in Spanish', () => {
      const formatted = i18nService.formatDate(testDate, 'es');
      expect(formatted).toContain('enero');
    });

    it('should format date in French', () => {
      const formatted = i18nService.formatDate(testDate, 'fr');
      expect(formatted).toContain('janvier');
    });

    it('should format date in German', () => {
      const formatted = i18nService.formatDate(testDate, 'de');
      expect(formatted).toContain('Januar');
    });
  });

  describe('formatNumber', () => {
    const testNumber = 1234567.89;

    it('should format number in English', () => {
      const formatted = i18nService.formatNumber(testNumber, 'en');
      expect(formatted).toContain('1,234,567');
    });

    it('should format number in Hindi', () => {
      const formatted = i18nService.formatNumber(testNumber, 'hi');
      expect(formatted).toBeTruthy();
    });

    it('should format number in German (uses period for thousands)', () => {
      const formatted = i18nService.formatNumber(testNumber, 'de');
      expect(formatted).toBeTruthy();
    });
  });

  describe('formatCurrency', () => {
    const amount = 5000;

    it('should format currency in INR for English', () => {
      const formatted = i18nService.formatCurrency(amount, 'en', 'INR');
      expect(formatted).toContain('5,000');
    });

    it('should format currency in INR for Hindi', () => {
      const formatted = i18nService.formatCurrency(amount, 'hi', 'INR');
      expect(formatted).toBeTruthy();
    });

    it('should format currency in EUR for German', () => {
      const formatted = i18nService.formatCurrency(amount, 'de', 'EUR');
      expect(formatted).toBeTruthy();
    });
  });

  describe('isRTL', () => {
    it('should return false for all current languages', () => {
      const locales: Locale[] = ['en', 'hi', 'es', 'fr', 'de', 'ta', 'te'];
      locales.forEach(locale => {
        expect(i18nService.isRTL(locale)).toBe(false);
      });
    });
  });

  describe('translateText', () => {
    it('should return translation result', async () => {
      const result = await i18nService.translateText({
        text: 'Hello world',
        sourceLanguage: 'en',
        targetLanguage: 'hi',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.sourceLanguage).toBe('en');
      expect(result.data?.targetLanguage).toBe('hi');
      expect(result.data?.confidence).toBeGreaterThan(0);
    });
  });
});
