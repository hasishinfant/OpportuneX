// WebRTC Service for Video Conferencing
import {
  BandwidthTestResult,
  MediaConstraints,
  RTCConfig,
  VideoQuality,
} from '@/types/video-conferencing';

export class WebRTCService {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private rtcConfig: RTCConfig;

  constructor(iceServers: RTCIceServer[]) {
    this.rtcConfig = {
      iceServers,
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    };
  }

  /**
   * Get user media with specified constraints
   */
  async getUserMedia(constraints: MediaConstraints): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      return stream;
    } catch (error) {
      console.error('Error getting user media:', error);
      throw new Error('Failed to access camera/microphone');
    }
  }

  /**
   * Get screen share stream
   */
  async getScreenShare(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
        } as MediaTrackConstraints,
        audio: false,
      });
      this.screenStream = stream;
      return stream;
    } catch (error) {
      console.error('Error getting screen share:', error);
      throw new Error('Failed to access screen share');
    }
  }

  /**
   * Create peer connection
   */
  createPeerConnection(
    peerId: string,
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onTrack: (event: RTCTrackEvent) => void,
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void
  ): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.rtcConfig);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = event => {
      if (event.candidate) {
        onIceCandidate(event.candidate);
      }
    };

    // Handle incoming tracks
    pc.ontrack = onTrack;

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Peer ${peerId} connection state:`, pc.connectionState);
      if (onConnectionStateChange) {
        onConnectionStateChange(pc.connectionState);
      }

      // Clean up on disconnect
      if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        this.removePeerConnection(peerId);
      }
    };

    this.peerConnections.set(peerId, pc);
    return pc;
  }

  /**
   * Create and send offer
   */
  async createOffer(peerId: string): Promise<RTCSessionDescriptionInit> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      throw new Error(`Peer connection not found for ${peerId}`);
    }

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await pc.setLocalDescription(offer);
    return offer;
  }

  /**
   * Create and send answer
   */
  async createAnswer(peerId: string): Promise<RTCSessionDescriptionInit> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      throw new Error(`Peer connection not found for ${peerId}`);
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  /**
   * Set remote description
   */
  async setRemoteDescription(
    peerId: string,
    description: RTCSessionDescriptionInit
  ): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      throw new Error(`Peer connection not found for ${peerId}`);
    }

    await pc.setRemoteDescription(new RTCSessionDescription(description));
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(
    peerId: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      console.warn(`Peer connection not found for ${peerId}`);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  /**
   * Toggle audio
   */
  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Toggle video
   */
  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Replace video track with screen share
   */
  async startScreenShare(peerId: string): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      throw new Error(`Peer connection not found for ${peerId}`);
    }

    const screenStream = await this.getScreenShare();
    const screenTrack = screenStream.getVideoTracks()[0];

    // Find and replace video sender
    const sender = pc.getSenders().find(s => s.track?.kind === 'video');

    if (sender) {
      await sender.replaceTrack(screenTrack);
    }

    // Handle screen share stop
    screenTrack.onended = () => {
      this.stopScreenShare(peerId);
    };
  }

  /**
   * Stop screen share and restore camera
   */
  async stopScreenShare(peerId: string): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc || !this.localStream) {
      return;
    }

    const videoTrack = this.localStream.getVideoTracks()[0];
    const sender = pc.getSenders().find(s => s.track?.kind === 'video');

    if (sender && videoTrack) {
      await sender.replaceTrack(videoTrack);
    }

    // Stop screen stream
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats(peerId: string): Promise<RTCStatsReport | null> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      return null;
    }

    return await pc.getStats();
  }

  /**
   * Measure bandwidth
   */
  async measureBandwidth(): Promise<BandwidthTestResult> {
    // Simple bandwidth test using WebRTC data channel
    const testPc = new RTCPeerConnection(this.rtcConfig);
    const dataChannel = testPc.createDataChannel('bandwidth-test');

    const startTime = Date.now();
    const testData = new ArrayBuffer(1024 * 1024); // 1MB
    let bytesSent = 0;

    return new Promise(resolve => {
      dataChannel.onopen = () => {
        const interval = setInterval(() => {
          if (dataChannel.bufferedAmount < 1024 * 1024 * 5) {
            // 5MB buffer
            dataChannel.send(testData);
            bytesSent += testData.byteLength;
          }

          if (Date.now() - startTime > 3000) {
            // 3 second test
            clearInterval(interval);
            const duration = (Date.now() - startTime) / 1000;
            const mbps = (bytesSent * 8) / (duration * 1000000);

            testPc.close();

            // Estimate quality based on bandwidth
            let quality: VideoQuality = 'low';
            if (mbps > 5) quality = 'hd';
            else if (mbps > 2) quality = 'high';
            else if (mbps > 1) quality = 'medium';

            resolve({
              downloadMbps: mbps,
              uploadMbps: mbps * 0.8, // Estimate
              latencyMs: 50, // Placeholder
              recommendedQuality: quality,
            });
          }
        }, 100);
      };

      // Timeout fallback
      setTimeout(() => {
        testPc.close();
        resolve({
          downloadMbps: 1,
          uploadMbps: 0.5,
          latencyMs: 100,
          recommendedQuality: 'low',
        });
      }, 5000);
    });
  }

  /**
   * Adjust video quality based on bandwidth
   */
  async adjustVideoQuality(
    peerId: string,
    quality: VideoQuality
  ): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      return;
    }

    const sender = pc.getSenders().find(s => s.track?.kind === 'video');

    if (!sender) {
      return;
    }

    const parameters = sender.getParameters();
    if (!parameters.encodings || parameters.encodings.length === 0) {
      parameters.encodings = [{}];
    }

    // Set bitrate based on quality
    const bitrateMap: Record<VideoQuality, number> = {
      low: 150000, // 150 kbps
      medium: 500000, // 500 kbps
      high: 1200000, // 1.2 Mbps
      hd: 2500000, // 2.5 Mbps
    };

    parameters.encodings[0].maxBitrate = bitrateMap[quality];

    await sender.setParameters(parameters);
  }

  /**
   * Remove peer connection
   */
  removePeerConnection(peerId: string): void {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
  }

  /**
   * Stop all media tracks
   */
  stopAllTracks(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
  }

  /**
   * Close all connections
   */
  closeAllConnections(): void {
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    this.stopAllTracks();
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get peer connection
   */
  getPeerConnection(peerId: string): RTCPeerConnection | undefined {
    return this.peerConnections.get(peerId);
  }

  /**
   * Get all peer IDs
   */
  getPeerIds(): string[] {
    return Array.from(this.peerConnections.keys());
  }
}

/**
 * Get default media constraints based on quality
 */
export function getMediaConstraints(quality: VideoQuality): MediaConstraints {
  const constraintsMap: Record<VideoQuality, MediaConstraints> = {
    low: {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: {
        width: { ideal: 320 },
        height: { ideal: 240 },
        frameRate: { ideal: 15 },
      },
    },
    medium: {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 24 },
      },
    },
    high: {
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
    },
    hd: {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
    },
  };

  return constraintsMap[quality];
}

/**
 * Check browser WebRTC support
 */
export function checkWebRTCSupport(): {
  supported: boolean;
  features: {
    getUserMedia: boolean;
    RTCPeerConnection: boolean;
    getDisplayMedia: boolean;
  };
} {
  return {
    supported:
      !!navigator.mediaDevices?.getUserMedia && !!window.RTCPeerConnection,
    features: {
      getUserMedia: !!navigator.mediaDevices?.getUserMedia,
      RTCPeerConnection: !!window.RTCPeerConnection,
      getDisplayMedia: !!navigator.mediaDevices?.getDisplayMedia,
    },
  };
}
