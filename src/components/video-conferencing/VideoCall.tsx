'use client';

import { WebRTCService } from '@/lib/services/webrtc.service';
import { VideoQuality } from '@/types/video-conferencing';
import { useEffect, useRef, useState } from 'react';
import { ChatPanel } from './ChatPanel';
import { ParticipantGrid } from './ParticipantGrid';
import { VideoControls } from './VideoControls';

interface VideoCallProps {
  roomCode: string;
  displayName: string;
  onLeave: () => void;
}

export function VideoCall({ roomCode, displayName, onLeave }: VideoCallProps) {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [participants, setParticipants] = useState<Map<string, MediaStream>>(
    new Map()
  );
  const [connectionQuality, setConnectionQuality] =
    useState<VideoQuality>('high');

  const webrtcService = useRef<WebRTCService | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    initializeCall();
    return () => cleanup();
  }, []);

  const initializeCall = async () => {
    try {
      // Join room via API
      const response = await fetch(`/api/video/rooms/${roomCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });

      const { data } = await response.json();
      const { iceServers, participant } = data;

      // Initialize WebRTC service
      webrtcService.current = new WebRTCService(iceServers);

      // Get user media
      const stream = await webrtcService.current.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      });

      // Display local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Connect to signaling server
      connectSignaling(participant.peerId);

      // Measure bandwidth
      measureBandwidth();
    } catch (error) {
      console.error('Error initializing call:', error);
      alert('Failed to join call. Please check camera/microphone permissions.');
    }
  };

  const connectSignaling = (peerId: string) => {
    const socket = require('socket.io-client')(
      process.env.NEXT_PUBLIC_SIGNALING_URL || 'http://localhost:3001'
    );

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to signaling server');

      socket.emit(
        'join-room',
        {
          roomCode,
          displayName,
          peerId,
        },
        (response: any) => {
          console.log('Joined room:', response);

          // Connect to existing participants
          response.participants.forEach((p: any) => {
            createPeerConnection(p.peerId);
          });
        }
      );
    });

    socket.on('participant-joined', (data: any) => {
      console.log('Participant joined:', data);
      createPeerConnection(data.peerId);
    });

    socket.on('participant-left', (data: any) => {
      console.log('Participant left:', data);
      removeParticipant(data.peerId);
    });

    socket.on('offer', async (data: any) => {
      await handleOffer(data.from, data.data);
    });

    socket.on('answer', async (data: any) => {
      await handleAnswer(data.from, data.data);
    });

    socket.on('ice-candidate', async (data: any) => {
      await handleIceCandidate(data.from, data.data);
    });

    socket.on('media-state', (data: any) => {
      console.log('Media state changed:', data);
    });

    socket.on('kicked', () => {
      alert('You have been removed from the call');
      handleLeave();
    });
  };

  const createPeerConnection = async (peerId: string) => {
    if (!webrtcService.current) return;

    const pc = webrtcService.current.createPeerConnection(
      peerId,
      candidate => {
        socketRef.current?.emit('ice-candidate', {
          type: 'ice-candidate',
          from: peerId,
          to: peerId,
          roomId: roomCode,
          data: candidate,
        });
      },
      event => {
        if (event.streams && event.streams[0]) {
          setParticipants(prev => {
            const newMap = new Map(prev);
            newMap.set(peerId, event.streams[0]);
            return newMap;
          });
        }
      },
      state => {
        console.log(`Connection state for ${peerId}:`, state);
      }
    );

    // Create and send offer
    const offer = await webrtcService.current.createOffer(peerId);
    socketRef.current?.emit('offer', {
      type: 'offer',
      from: peerId,
      to: peerId,
      roomId: roomCode,
      data: offer,
    });
  };

  const handleOffer = async (
    from: string,
    offer: RTCSessionDescriptionInit
  ) => {
    if (!webrtcService.current) return;

    await webrtcService.current.setRemoteDescription(from, offer);
    const answer = await webrtcService.current.createAnswer(from);

    socketRef.current?.emit('answer', {
      type: 'answer',
      from,
      to: from,
      roomId: roomCode,
      data: answer,
    });
  };

  const handleAnswer = async (
    from: string,
    answer: RTCSessionDescriptionInit
  ) => {
    if (!webrtcService.current) return;
    await webrtcService.current.setRemoteDescription(from, answer);
  };

  const handleIceCandidate = async (
    from: string,
    candidate: RTCIceCandidateInit
  ) => {
    if (!webrtcService.current) return;
    await webrtcService.current.addIceCandidate(from, candidate);
  };

  const removeParticipant = (peerId: string) => {
    setParticipants(prev => {
      const newMap = new Map(prev);
      newMap.delete(peerId);
      return newMap;
    });
    webrtcService.current?.removePeerConnection(peerId);
  };

  const measureBandwidth = async () => {
    if (!webrtcService.current) return;

    try {
      const result = await webrtcService.current.measureBandwidth();
      setConnectionQuality(result.recommendedQuality);

      // Adjust quality for all peers
      const peerIds = webrtcService.current.getPeerIds();
      for (const peerId of peerIds) {
        await webrtcService.current.adjustVideoQuality(
          peerId,
          result.recommendedQuality
        );
      }
    } catch (error) {
      console.error('Error measuring bandwidth:', error);
    }
  };

  const toggleAudio = () => {
    if (webrtcService.current) {
      const newState = !isAudioEnabled;
      webrtcService.current.toggleAudio(newState);
      setIsAudioEnabled(newState);

      socketRef.current?.emit('media-state', {
        audio: newState,
        video: isVideoEnabled,
        screenShare: isScreenSharing,
      });
    }
  };

  const toggleVideo = () => {
    if (webrtcService.current) {
      const newState = !isVideoEnabled;
      webrtcService.current.toggleVideo(newState);
      setIsVideoEnabled(newState);

      socketRef.current?.emit('media-state', {
        audio: isAudioEnabled,
        video: newState,
        screenShare: isScreenSharing,
      });
    }
  };

  const toggleScreenShare = async () => {
    if (!webrtcService.current) return;

    try {
      if (!isScreenSharing) {
        const peerIds = webrtcService.current.getPeerIds();
        for (const peerId of peerIds) {
          await webrtcService.current.startScreenShare(peerId);
        }
        setIsScreenSharing(true);
        socketRef.current?.emit('screen-share-start', {});
      } else {
        const peerIds = webrtcService.current.getPeerIds();
        for (const peerId of peerIds) {
          await webrtcService.current.stopScreenShare(peerId);
        }
        setIsScreenSharing(false);
        socketRef.current?.emit('screen-share-stop', {});
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  };

  const handleLeave = () => {
    cleanup();
    onLeave();
  };

  const cleanup = () => {
    webrtcService.current?.closeAllConnections();
    socketRef.current?.disconnect();
  };

  return (
    <div className='flex h-screen bg-gray-900'>
      <div className='flex-1 flex flex-col'>
        {/* Video Grid */}
        <div className='flex-1 p-4'>
          <ParticipantGrid
            localStream={webrtcService.current?.getLocalStream() || null}
            participants={participants}
            localVideoRef={localVideoRef}
          />
        </div>

        {/* Controls */}
        <div className='p-4 bg-gray-800'>
          <VideoControls
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={isVideoEnabled}
            isScreenSharing={isScreenSharing}
            connectionQuality={connectionQuality}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            onToggleScreenShare={toggleScreenShare}
            onToggleChat={() => setIsChatOpen(!isChatOpen)}
            onLeave={handleLeave}
          />
        </div>
      </div>

      {/* Chat Panel */}
      {isChatOpen && (
        <ChatPanel roomCode={roomCode} onClose={() => setIsChatOpen(false)} />
      )}
    </div>
  );
}
