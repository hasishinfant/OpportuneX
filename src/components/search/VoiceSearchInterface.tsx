'use client';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioVisualizer } from './AudioVisualizer';

interface VoiceSearchInterfaceProps {
  onVoiceSearch: (audioBlob: Blob) => void;
  onTranscription?: (text: string) => void;
  className?: string;
  disabled?: boolean;
  maxRecordingTime?: number; // in seconds
  language?: 'en' | 'hi';
}

export function VoiceSearchInterface({
  onVoiceSearch,
  onTranscription,
  className,
  disabled = false,
  maxRecordingTime = 60,
  language = 'en',
}: VoiceSearchInterfaceProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Check if browser supports voice recording
  const isSupported =
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia;

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const startRecording = useCallback(async () => {
    if (!isSupported || disabled) return;

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });

        setIsProcessing(true);
        onVoiceSearch(audioBlob);

        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
        setAudioStream(null);

        // Reset processing state after a delay
        setTimeout(() => setIsProcessing(false), 2000);
      };

      mediaRecorder.onerror = event => {
        console.error('MediaRecorder error:', event);
        setError('Recording failed. Please try again.');
        stopRecording();
      };

      mediaRecorderRef.current = mediaRecorder;
      setAudioStream(stream);
      mediaRecorder.start(100); // Collect data every 100ms for better visualization
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxRecordingTime) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Microphone access denied or not available.');
    }
  }, [isSupported, disabled, onVoiceSearch, maxRecordingTime]);

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

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      // Stop recording without processing
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      // Clean up stream
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }

      audioChunksRef.current = [];
    }
  }, [isRecording, audioStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioStream]);

  if (!isSupported) {
    return (
      <div
        className={cn('text-center p-4 bg-secondary-50 rounded-lg', className)}
      >
        <p className='text-sm text-secondary-600'>
          Voice search is not supported in your browser.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Recording Status */}
      {(isRecording || isProcessing) && (
        <div className='text-center'>
          <div className='inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-full'>
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                isRecording ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
              )}
            />
            <span className='text-sm font-medium text-blue-700'>
              {isRecording
                ? `Recording... ${formatTime(recordingTime)}`
                : 'Processing...'}
            </span>
          </div>
        </div>
      )}

      {/* Audio Visualizer */}
      {isRecording && (
        <div className='flex justify-center'>
          <AudioVisualizer
            isRecording={isRecording}
            audioStream={audioStream || undefined}
            className='shadow-sm'
          />
        </div>
      )}

      {/* Control Buttons */}
      <div className='flex justify-center space-x-3'>
        {!isRecording ? (
          <Button
            onClick={startRecording}
            disabled={disabled || isProcessing}
            className='flex items-center space-x-2 px-6 py-3'
            size='lg'
          >
            <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 24 24'>
              <path d='M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z' />
              <path d='M19 10v2a7 7 0 0 1-14 0v-2' />
              <line x1='12' y1='19' x2='12' y2='23' />
              <line x1='8' y1='23' x2='16' y2='23' />
            </svg>
            <span>Start Voice Search</span>
          </Button>
        ) : (
          <div className='flex space-x-2'>
            <Button
              onClick={stopRecording}
              variant='primary'
              className='flex items-center space-x-2 px-4 py-2'
            >
              <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 24 24'>
                <rect x='6' y='6' width='12' height='12' rx='2' />
              </svg>
              <span>Stop & Search</span>
            </Button>

            <Button
              onClick={cancelRecording}
              variant='outline'
              className='flex items-center space-x-2 px-4 py-2'
            >
              <svg
                className='w-4 h-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
              <span>Cancel</span>
            </Button>
          </div>
        )}
      </div>

      {/* Recording Progress */}
      {isRecording && (
        <div className='w-full bg-secondary-200 rounded-full h-2'>
          <div
            className='bg-blue-500 h-2 rounded-full transition-all duration-1000'
            style={{ width: `${(recordingTime / maxRecordingTime) * 100}%` }}
          />
        </div>
      )}

      {/* Language Selection */}
      <div className='flex justify-center'>
        <div className='flex items-center space-x-2 text-sm text-secondary-600'>
          <span>Language:</span>
          <select
            value={language}
            onChange={e => {
              // This would be handled by parent component
              console.log('Language changed to:', e.target.value);
            }}
            className='border border-secondary-300 rounded px-2 py-1 text-sm'
            disabled={isRecording}
          >
            <option value='en'>English</option>
            <option value='hi'>हिंदी (Hindi)</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className='text-center p-3 bg-red-50 border border-red-200 rounded-lg'>
          <p className='text-sm text-red-600'>{error}</p>
          <button
            onClick={() => setError(null)}
            className='mt-1 text-xs text-red-500 hover:text-red-700 underline'
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Instructions */}
      {!isRecording && !isProcessing && (
        <div className='text-center text-sm text-secondary-500 space-y-1'>
          <p>Click the microphone to start voice search</p>
          <p>Speak clearly and mention what you're looking for</p>
          <p className='text-xs'>
            Example: "Find AI hackathons in Mumbai" or "Show me remote
            internships"
          </p>
        </div>
      )}
    </div>
  );
}
