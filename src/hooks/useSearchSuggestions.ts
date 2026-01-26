import { useCallback, useEffect, useState } from 'react';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'popular' | 'autocomplete';
  count?: number;
}

interface UseSearchSuggestionsProps {
  query: string;
  enabled?: boolean;
  maxSuggestions?: number;
}

export function useSearchSuggestions({
  query,
  enabled = true,
  maxSuggestions = 8,
}: UseSearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock popular searches - in real app, this would come from analytics
  const popularSearches = [
    'AI hackathons',
    'Remote internships',
    'Web development workshops',
    'Data science competitions',
    'Startup internships',
    'Machine learning bootcamp',
    'Frontend development',
    'Backend engineering',
  ];

  // Get recent searches from localStorage
  const getRecentSearches = useCallback((): string[] => {
    if (typeof window === 'undefined') return [];
    try {
      const recent = localStorage.getItem('opportunex_recent_searches');
      return recent ? JSON.parse(recent) : [];
    } catch {
      return [];
    }
  }, []);

  // Save search to recent searches
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (typeof window === 'undefined' || !searchQuery.trim()) return;
    
    try {
      const recent = getRecentSearches();
      const updated = [
        searchQuery.trim(),
        ...recent.filter(s => s !== searchQuery.trim())
      ].slice(0, 10); // Keep only last 10 searches
      
      localStorage.setItem('opportunex_recent_searches', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  }, [getRecentSearches]);

  // Generate autocomplete suggestions
  const generateAutocompleteSuggestions = useCallback((searchQuery: string): SearchSuggestion[] => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const suggestions: SearchSuggestion[] = [];

    // Add matching popular searches
    popularSearches.forEach((search, index) => {
      if (search.toLowerCase().includes(query) && search.toLowerCase() !== query) {
        suggestions.push({
          id: `popular-${index}`,
          text: search,
          type: 'popular',
          count: Math.floor(Math.random() * 1000) + 100, // Mock popularity count
        });
      }
    });

    // Add matching recent searches
    const recentSearches = getRecentSearches();
    recentSearches.forEach((search, index) => {
      if (search.toLowerCase().includes(query) && search.toLowerCase() !== query) {
        suggestions.push({
          id: `recent-${index}`,
          text: search,
          type: 'recent',
        });
      }
    });

    // Generate contextual autocomplete suggestions
    const contextualSuggestions = [
      `${searchQuery} internships`,
      `${searchQuery} hackathons`,
      `${searchQuery} workshops`,
      `${searchQuery} remote`,
      `${searchQuery} 2024`,
    ];

    contextualSuggestions.forEach((suggestion, index) => {
      if (suggestion.toLowerCase() !== query) {
        suggestions.push({
          id: `autocomplete-${index}`,
          text: suggestion,
          type: 'autocomplete',
        });
      }
    });

    // Remove duplicates and limit results
    const uniqueSuggestions = suggestions.filter((suggestion, index, self) =>
      index === self.findIndex(s => s.text.toLowerCase() === suggestion.text.toLowerCase())
    );

    return uniqueSuggestions.slice(0, maxSuggestions);
  }, [getRecentSearches, maxSuggestions]);

  // Update suggestions when query changes
  useEffect(() => {
    if (!enabled) {
      setSuggestions([]);
      return;
    }

    if (!query.trim()) {
      // Show recent searches when no query
      const recentSearches = getRecentSearches();
      const recentSuggestions: SearchSuggestion[] = recentSearches.slice(0, 5).map((search, index) => ({
        id: `recent-${index}`,
        text: search,
        type: 'recent',
      }));
      setSuggestions(recentSuggestions);
      return;
    }

    setLoading(true);
    
    // Simulate API delay for autocomplete
    const timeoutId = setTimeout(() => {
      const newSuggestions = generateAutocompleteSuggestions(query);
      setSuggestions(newSuggestions);
      setLoading(false);
    }, 150);

    return () => {
      clearTimeout(timeoutId);
      setLoading(false);
    };
  }, [query, enabled, generateAutocompleteSuggestions, getRecentSearches]);

  return {
    suggestions,
    loading,
    saveRecentSearch,
    clearRecentSearches: useCallback(() => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('opportunex_recent_searches');
        setSuggestions([]);
      }
    }, []),
  };
}