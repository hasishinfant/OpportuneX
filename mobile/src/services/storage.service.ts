import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Opportunity } from '../types';

class StorageService {
  private readonly SAVED_OPPORTUNITIES_KEY = 'saved_opportunities';
  private readonly SEARCH_HISTORY_KEY = 'search_history';

  // Saved Opportunities
  async getSavedOpportunities(): Promise<Opportunity[]> {
    try {
      const data = await AsyncStorage.getItem(this.SAVED_OPPORTUNITIES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Get saved opportunities error:', error);
      return [];
    }
  }

  async saveOpportunity(opportunity: Opportunity): Promise<void> {
    try {
      const saved = await this.getSavedOpportunities();
      const exists = saved.find(o => o.id === opportunity.id);

      if (!exists) {
        saved.push({ ...opportunity, isSaved: true });
        await AsyncStorage.setItem(
          this.SAVED_OPPORTUNITIES_KEY,
          JSON.stringify(saved)
        );
      }
    } catch (error) {
      console.error('Save opportunity error:', error);
      throw error;
    }
  }

  async unsaveOpportunity(opportunityId: string): Promise<void> {
    try {
      const saved = await this.getSavedOpportunities();
      const filtered = saved.filter(o => o.id !== opportunityId);
      await AsyncStorage.setItem(
        this.SAVED_OPPORTUNITIES_KEY,
        JSON.stringify(filtered)
      );
    } catch (error) {
      console.error('Unsave opportunity error:', error);
      throw error;
    }
  }

  async isOpportunitySaved(opportunityId: string): Promise<boolean> {
    try {
      const saved = await this.getSavedOpportunities();
      return saved.some(o => o.id === opportunityId);
    } catch (error) {
      console.error('Check saved opportunity error:', error);
      return false;
    }
  }

  // Search History
  async getSearchHistory(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(this.SEARCH_HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Get search history error:', error);
      return [];
    }
  }

  async addToSearchHistory(query: string): Promise<void> {
    try {
      const history = await this.getSearchHistory();
      const filtered = history.filter(q => q !== query);
      filtered.unshift(query);

      // Keep only last 20 searches
      const limited = filtered.slice(0, 20);
      await AsyncStorage.setItem(
        this.SEARCH_HISTORY_KEY,
        JSON.stringify(limited)
      );
    } catch (error) {
      console.error('Add to search history error:', error);
    }
  }

  async clearSearchHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error('Clear search history error:', error);
    }
  }

  // Clear all data
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.SAVED_OPPORTUNITIES_KEY,
        this.SEARCH_HISTORY_KEY,
      ]);
    } catch (error) {
      console.error('Clear all error:', error);
    }
  }
}

export const storageService = new StorageService();
