'use client';

import { VideoQuality } from '@/types/video-conferencing';
import {
  MessageSquare,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Signal,
  Video,
  VideoOff,
} from 'lucide-react';

interface VideoControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  connectionQuality: VideoQuality;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onLeave: () => void;
}

export function VideoControls({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  connectionQuality,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onLeave,
}: VideoControlsProps) {
  const getQualityColor = () => {
    switch (connectionQuality) {
      case 'hd':
      case 'high':
        return 'text-green-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className='flex items-center justify-center gap-4'>
      {/* Audio Toggle */}
      <button
        onClick={onToggleAudio}
        className={`p-4 rounded-full transition-colors ${
          isAudioEnabled
            ? 'bg-gray-700 hover:bg-gray-600'
            : 'bg-red-600 hover:bg-red-700'
        }`}
        aria-label={isAudioEnabled ? 'Mute' : 'Unmute'}
      >
        {isAudioEnabled ? (
          <Mic className='w-6 h-6 text-white' />
        ) : (
          <MicOff className='w-6 h-6 text-white' />
        )}
      </button>

      {/* Video Toggle */}
      <button
        onClick={onToggleVideo}
        className={`p-4 rounded-full transition-colors ${
          isVideoEnabled
            ? 'bg-gray-700 hover:bg-gray-600'
            : 'bg-red-600 hover:bg-red-700'
        }`}
        aria-label={isVideoEnabled ? 'Stop Video' : 'Start Video'}
      >
        {isVideoEnabled ? (
          <Video className='w-6 h-6 text-white' />
        ) : (
          <VideoOff className='w-6 h-6 text-white' />
        )}
      </button>

      {/* Screen Share Toggle */}
      <button
        onClick={onToggleScreenShare}
        className={`p-4 rounded-full transition-colors ${
          isScreenSharing
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-gray-700 hover:bg-gray-600'
        }`}
        aria-label={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
      >
        {isScreenSharing ? (
          <MonitorOff className='w-6 h-6 text-white' />
        ) : (
          <Monitor className='w-6 h-6 text-white' />
        )}
      </button>

      {/* Chat Toggle */}
      <button
        onClick={onToggleChat}
        className='p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors'
        aria-label='Toggle Chat'
      >
        <MessageSquare className='w-6 h-6 text-white' />
      </button>

      {/* Connection Quality Indicator */}
      <div className='flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-full'>
        <Signal className={`w-5 h-5 ${getQualityColor()}`} />
        <span className='text-sm text-white capitalize'>
          {connectionQuality}
        </span>
      </div>

      {/* Leave Button */}
      <button
        onClick={onLeave}
        className='p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors'
        aria-label='Leave Call'
      >
        <PhoneOff className='w-6 h-6 text-white' />
      </button>
    </div>
  );
}
