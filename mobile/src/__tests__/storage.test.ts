import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageService } from '../services/storage.service';
import type { Opportunity } from '../types';

describe('StorageService', () => {
  beforeEach(() => {
    AsyncStorage.clear();
  });

  const mockOpportunity: Opportunity = {
    id: '1',
    title: 'Test Hackathon',
    description: 'Test description',
    type: 'hackathon',
    organizer: {
      name: 'Test Org',
      type: 'corporate',
    },
    requirements: {
      skills: ['JavaScript', 'React'],
      eligibility: ['Students'],
    },
    details: {
      mode: 'online',
    },
    timeline: {
      applicationDeadline: '2024-12-31',
    },
    externalUrl: 'https://example.com',
    tags: ['tech', 'coding'],
  };

  describe('Saved Opportunities', () => {
    it('should save an opportunity', async () => {
      await storageService.saveOpportunity(mockOpportunity);
      const saved = await storageService.getSavedOpportunities();

      expect(saved).toHaveLength(1);
      expect(saved[0].id).toBe(mockOpportunity.id);
      expect(saved[0].isSaved).toBe(true);
    });

    it('should not duplicate saved opportunities', async () => {
      await storageService.saveOpportunity(mockOpportunity);
      await storageService.saveOpportunity(mockOpportunity);
      const saved = await storageService.getSavedOpportunities();

      expect(saved).toHaveLength(1);
    });

    it('should unsave an opportunity', async () => {
      await storageService.saveOpportunity(mockOpportunity);
      await storageService.unsaveOpportunity(mockOpportunity.id);
      const saved = await storageService.getSavedOpportunities();

      expect(saved).toHaveLength(0);
    });

    it('should check if opportunity is saved', async () => {
      await storageService.saveOpportunity(mockOpportunity);
      const isSaved = await storageService.isOpportunitySaved(
        mockOpportunity.id
      );

      expect(isSaved).toBe(true);
    });

    it('should return false for unsaved opportunity', async () => {
      const isSaved = await storageService.isOpportunitySaved('non-existent');

      expect(isSaved).toBe(false);
    });
  });

  describe('Search History', () => {
    it('should add to search history', async () => {
      await storageService.addToSearchHistory('test query');
      const history = await storageService.getSearchHistory();

      expect(history).toHaveLength(1);
      expect(history[0]).toBe('test query');
    });

    it('should not duplicate search queries', async () => {
      await storageService.addToSearchHistory('test query');
      await storageService.addToSearchHistory('test query');
      const history = await storageService.getSearchHistory();

      expect(history).toHaveLength(1);
    });

    it('should keep recent searches at the top', async () => {
      await storageService.addToSearchHistory('first');
      await storageService.addToSearchHistory('second');
      await storageService.addToSearchHistory('third');
      const history = await storageService.getSearchHistory();

      expect(history[0]).toBe('third');
      expect(history[1]).toBe('second');
      expect(history[2]).toBe('first');
    });

    it('should limit search history to 20 items', async () => {
      for (let i = 0; i < 25; i++) {
        await storageService.addToSearchHistory(`query ${i}`);
      }
      const history = await storageService.getSearchHistory();

      expect(history).toHaveLength(20);
    });

    it('should clear search history', async () => {
      await storageService.addToSearchHistory('test query');
      await storageService.clearSearchHistory();
      const history = await storageService.getSearchHistory();

      expect(history).toHaveLength(0);
    });
  });

  describe('Clear All', () => {
    it('should clear all stored data', async () => {
      await storageService.saveOpportunity(mockOpportunity);
      await storageService.addToSearchHistory('test query');
      await storageService.clearAll();

      const saved = await storageService.getSavedOpportunities();
      const history = await storageService.getSearchHistory();

      expect(saved).toHaveLength(0);
      expect(history).toHaveLength(0);
    });
  });
});
