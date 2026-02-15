'use client';

import React, { useEffect, useRef } from 'react';

interface ParticipantGridProps {
  localStream: MediaStream | null;
  participants: Map<string, MediaStream>;
  localVideoRef: React.RefObject<HTMLVideoElement>;
}

export function ParticipantGrid({
  localStream,
  participants,
  localVideoRef,
}: ParticipantGridProps) {
  const getGridClass = () => {
    const totalParticipants = participants.size + 1; // +1 for local

    if (totalParticipants === 1) {
      return 'grid-cols-1';
    } else if (totalParticipants === 2) {
      return 'grid-cols-2';
    } else if (totalParticipants <= 4) {
      return 'grid-cols-2 grid-rows-2';
    } else if (totalParticipants <= 6) {
      return 'grid-cols-3 grid-rows-2';
    } else {
      return 'grid-cols-3 grid-rows-3';
    }
  };

  return (
    <div className={`grid ${getGridClass()} gap-4 h-full`}>
      {/* Local Video */}
      <div className='relative bg-gray-800 rounded-lg overflow-hidden'>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className='w-full h-full object-cover'
        />
        <div className='absolute bottom-2 left-2 px-3 py-1 bg-black bg-opacity-50 rounded text-white text-sm'>
          You
        </div>
      </div>

      {/* Remote Participants */}
      {Array.from(participants.entries()).map(([peerId, stream]) => (
        <ParticipantVideo key={peerId} peerId={peerId} stream={stream} />
      ))}
    </div>
  );
}

interface ParticipantVideoProps {
  peerId: string;
  stream: MediaStream;
}

function ParticipantVideo({ peerId, stream }: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className='relative bg-gray-800 rounded-lg overflow-hidden'>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className='w-full h-full object-cover'
      />
      <div className='absolute bottom-2 left-2 px-3 py-1 bg-black bg-opacity-50 rounded text-white text-sm'>
        {peerId.substring(0, 8)}
      </div>
    </div>
  );
}
