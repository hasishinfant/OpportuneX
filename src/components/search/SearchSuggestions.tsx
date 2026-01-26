'use client';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'popular' | 'autocomplete';
  count?: number;
}

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  loading?: boolean;
  onSelect: (suggestion: string) => void;
  onClearRecent?: () => void;
  className?: string;
  visible?: boolean;
}

export function SearchSuggestions({
  suggestions,
  loading = false,
  onSelect,
  onClearRecent,
  className,
  visible = true,
}: SearchSuggestionsProps) {
  if (!visible || (!loading && suggestions.length === 0)) {
    return null;
  }

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'recent':
        return (
          <svg className="w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'popular':
        return (
          <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'autocomplete':
        return (
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
    }
  };

  const getSuggestionLabel = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'recent':
        return 'Recent';
      case 'popular':
        return 'Popular';
      case 'autocomplete':
        return 'Suggestion';
    }
  };

  const hasRecentSuggestions = suggestions.some(s => s.type === 'recent');

  return (
    <div className={cn(
      'absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-secondary-200 rounded-lg shadow-lg max-h-96 overflow-y-auto',
      className
    )}>
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-sm text-secondary-600">Loading suggestions...</span>
        </div>
      ) : (
        <>
          {/* Clear recent searches option */}
          {hasRecentSuggestions && onClearRecent && (
            <div className="border-b border-secondary-100 p-2">
              <button
                onClick={onClearRecent}
                className="text-xs text-secondary-500 hover:text-secondary-700 transition-colors"
              >
                Clear recent searches
              </button>
            </div>
          )}

          {/* Suggestions list */}
          <div className="py-1">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => onSelect(suggestion.text)}
                className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-secondary-50 transition-colors group"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getSuggestionIcon(suggestion.type)}
                  <span className="text-sm text-secondary-900 truncate">
                    {suggestion.text}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {suggestion.count && (
                    <span className="text-xs text-secondary-400">
                      {suggestion.count.toLocaleString()}
                    </span>
                  )}
                  <span className="text-xs text-secondary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {getSuggestionLabel(suggestion.type)}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* No suggestions message */}
          {suggestions.length === 0 && (
            <div className="px-4 py-3 text-sm text-secondary-500 text-center">
              No suggestions found
            </div>
          )}
        </>
      )}
    </div>
  );
}