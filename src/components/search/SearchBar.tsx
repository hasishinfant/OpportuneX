'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useSearchSuggestions } from '@/hooks/useSearchSuggestions';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SearchSuggestions } from './SearchSuggestions';
import { VoiceSearchInterface } from './VoiceSearchInterface';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onVoiceSearch?: (audioBlob: Blob) => void;
  onRealTimeSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  loading?: boolean;
  voiceSupported?: boolean;
  enableRealTimeSearch?: boolean;
  enableSuggestions?: boolean;
  enableEnhancedVoice?: boolean;
  debounceMs?: number;
}

export function SearchBar({
  onSearch,
  onVoiceSearch,
  onRealTimeSearch,
  placeholder = 'Search for hackathons, internships, workshops...',
  className,
  loading = false,
  voiceSupported = true,
  enableRealTimeSearch = false,
  enableSuggestions = true,
  enableEnhancedVoice = false,
  debounceMs = 300,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showVoiceInterface, setShowVoiceInterface] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search suggestions hook
  const {
    suggestions,
    loading: suggestionsLoading,
    saveRecentSearch,
    clearRecentSearches,
  } = useSearchSuggestions({
    query,
    enabled: enableSuggestions && showSuggestions,
  });

  // Real-time search with debouncing
  useEffect(() => {
    if (!enableRealTimeSearch || !onRealTimeSearch) return;

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout for debounced search
    if (query.trim().length > 0) {
      debounceTimeoutRef.current = setTimeout(() => {
        onRealTimeSearch(query.trim());
      }, debounceMs);
    }

    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query, enableRealTimeSearch, onRealTimeSearch, debounceMs]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim() && !loading) {
        saveRecentSearch(query.trim());
        onSearch(query.trim());
        setShowSuggestions(false);
      }
    },
    [query, loading, onSearch, saveRecentSearch]
  );

  const handleSuggestionSelect = useCallback(
    (suggestion: string) => {
      setQuery(suggestion);
      saveRecentSearch(suggestion);
      onSearch(suggestion);
      setShowSuggestions(false);
      inputRef.current?.focus();
    },
    [onSearch, saveRecentSearch]
  );

  const handleInputFocus = useCallback(() => {
    setShowSuggestions(true);
  }, []);

  const handleInputBlur = useCallback(() => {
    // Delay hiding suggestions to allow for suggestion clicks
    setTimeout(() => setShowSuggestions(false), 200);
  }, []);

  const startRecording = useCallback(async () => {
    if (!onVoiceSearch || !navigator.mediaDevices) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        onVoiceSearch(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, [onVoiceSearch]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('w-full max-w-4xl mx-auto', className)}>
      <form onSubmit={handleSubmit} className='relative'>
        <div className='relative flex items-center'>
          {/* Search Input */}
          <div className='flex-1 relative'>
            <Input
              ref={inputRef}
              type='text'
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={placeholder}
              className='pr-24 h-12 text-base shadow-lg border-2 border-secondary-200 focus:border-primary-500'
              disabled={loading || isRecording}
            />

            {/* Search Suggestions */}
            {enableSuggestions && (
              <SearchSuggestions
                suggestions={suggestions}
                loading={suggestionsLoading}
                visible={showSuggestions}
                onSelect={handleSuggestionSelect}
                onClearRecent={clearRecentSearches}
              />
            )}

            {/* Voice Recording Indicator */}
            {isRecording && (
              <div className='absolute right-20 top-1/2 transform -translate-y-1/2 flex items-center space-x-2'>
                <div className='w-2 h-2 bg-red-500 rounded-full animate-pulse' />
                <span className='text-sm text-red-600 font-medium'>
                  {formatTime(recordingTime)}
                </span>
              </div>
            )}
          </div>

          {/* Voice Search Button */}
          {voiceSupported && onVoiceSearch && (
            <Button
              type='button'
              variant={isRecording ? 'primary' : 'outline'}
              size='md'
              className={cn(
                'absolute right-12 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0',
                isRecording && 'bg-red-500 hover:bg-red-600'
              )}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading}
              aria-label={isRecording ? 'Stop recording' : 'Start voice search'}
            >
              {isRecording ? (
                <svg
                  className='h-4 w-4'
                  fill='currentColor'
                  viewBox='0 0 24 24'
                >
                  <rect x='6' y='6' width='12' height='12' rx='2' />
                </svg>
              ) : (
                <svg
                  className='h-4 w-4'
                  fill='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path d='M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z' />
                  <path d='M19 10v2a7 7 0 0 1-14 0v-2' />
                  <line x1='12' y1='19' x2='12' y2='23' />
                  <line x1='8' y1='23' x2='16' y2='23' />
                </svg>
              )}
            </Button>
          )}

          {/* Search Button */}
          <Button
            type='submit'
            className='absolute right-2 top-1/2 transform -translate-y-1/2 h-8 px-3'
            disabled={loading || !query.trim() || isRecording}
          >
            {loading ? (
              <LoadingSpinner size='sm' color='white' />
            ) : (
              <svg
                className='h-4 w-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                />
              </svg>
            )}
          </Button>
        </div>

        {/* Voice Search Status */}
        {isRecording && (
          <div className='mt-2 text-center'>
            <p className='text-sm text-secondary-600'>
              🎤 Listening... Speak clearly and click stop when done
            </p>
          </div>
        )}
      </form>

      {/* Quick Search Suggestions */}
      <div className='mt-4 flex flex-wrap gap-2 justify-center'>
        {[
          'AI hackathons',
          'Remote internships',
          'Web development workshops',
          'Data science competitions',
          'Startup internships',
        ].map(suggestion => (
          <button
            key={suggestion}
            onClick={() => {
              setQuery(suggestion);
              handleSuggestionSelect(suggestion);
            }}
            className='px-3 py-1 text-sm bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-full transition-colors'
            disabled={loading || isRecording}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Enhanced Voice Search Interface */}
      {enableEnhancedVoice && voiceSupported && onVoiceSearch && (
        <div className='mt-6'>
          <div className='text-center mb-4'>
            <Button
              onClick={() => setShowVoiceInterface(!showVoiceInterface)}
              variant='outline'
              className='flex items-center space-x-2'
            >
              <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 24 24'>
                <path d='M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z' />
                <path d='M19 10v2a7 7 0 0 1-14 0v-2' />
                <line x1='12' y1='19' x2='12' y2='23' />
                <line x1='8' y1='23' x2='16' y2='23' />
              </svg>
              <span>{showVoiceInterface ? 'Hide' : 'Show'} Voice Search</span>
            </Button>
          </div>

          {showVoiceInterface && (
            <div className='border border-secondary-200 rounded-lg p-6 bg-secondary-50'>
              <VoiceSearchInterface
                onVoiceSearch={audioBlob => {
                  onVoiceSearch(audioBlob);
                  setShowVoiceInterface(false);
                }}
                disabled={loading}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
