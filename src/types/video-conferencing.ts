// Video Conferencing Types

export type RoomType = 'one_on_one' | 'group' | 'presentation' | 'interview';
export type RoomStatus = 'scheduled' | 'active' | 'ended' | 'cancelled';
export type ParticipantRole = 'host' | 'co_host' | 'participant' | 'observer';
export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor';
export type RecordingStatus = 'processing' | 'ready' | 'failed' | 'deleted';
export type MessageType = 'text' | 'file' | 'poll' | 'reaction';
export type BackgroundType = 'image' | 'blur' | 'none';
export type VideoQuality = 'low' | 'medium' | 'high' | 'hd';

export interface VideoCallRoom {
  id: string;
  roomCode: string;
  name: string;
  description?: string;
  roomType: RoomType;
  hostId: string;
  maxParticipants: number;
  isRecordingEnabled: boolean;
  isWaitingRoomEnabled: boolean;
  isLocked: boolean;
  passwordHash?: string;
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  status: RoomStatus;
  settings: RoomSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomSettings {
  allowScreenShare?: boolean;
  allowChat?: boolean;
  allowReactions?: boolean;
  allowVirtualBackgrounds?: boolean;
  muteOnEntry?: boolean;
  videoOnEntry?: boolean;
  maxVideoBitrate?: number;
  maxAudioBitrate?: number;
  enableSpatialAudio?: boolean;
  recordingAutoStart?: boolean;
}

export interface VideoCallParticipant {
  id: string;
  roomId: string;
  userId?: string;
  peerId: string;
  displayName: string;
  role: ParticipantRole;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  connectionQuality?: ConnectionQuality;
  joinedAt: Date;
  leftAt?: Date;
  durationSeconds?: number;
  createdAt: Date;
}

export interface VideoCallRecording {
  id: string;
  roomId: string;
  recordingUrl?: string;
  storageKey?: string;
  fileSizeBytes?: number;
  durationSeconds?: number;
  format: string;
  status: RecordingStatus;
  startedAt: Date;
  endedAt?: Date;
  isPublic: boolean;
  accessToken?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoCallMessage {
  id: string;
  roomId: string;
  participantId: string;
  messageType: MessageType;
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface BreakoutRoom {
  id: string;
  parentRoomId: string;
  name: string;
  maxParticipants: number;
  autoAssign: boolean;
  durationMinutes?: number;
  startedAt?: Date;
  endedAt?: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface BreakoutRoomAssignment {
  id: string;
  breakoutRoomId: string;
  participantId: string;
  assignedAt: Date;
  joinedAt?: Date;
  leftAt?: Date;
}

export interface VideoCallPoll {
  id: string;
  roomId: string;
  creatorId: string;
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  isAnonymous: boolean;
  isActive: boolean;
  endsAt?: Date;
  createdAt: Date;
}

export interface PollOption {
  id: string;
  text: string;
  votes?: number;
}

export interface VideoCallPollResponse {
  id: string;
  pollId: string;
  participantId: string;
  selectedOptions: string[];
  createdAt: Date;
}

export interface VideoCallAnalytics {
  id: string;
  roomId: string;
  totalParticipants: number;
  peakParticipants: number;
  totalDurationSeconds: number;
  averageConnectionQuality?: ConnectionQuality;
  totalMessages: number;
  screenShareDurationSeconds: number;
  recordingDurationSeconds: number;
  bandwidthStats?: BandwidthStats;
  qualityStats?: QualityStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface BandwidthStats {
  averageDownloadMbps: number;
  averageUploadMbps: number;
  averageLatencyMs: number;
  averagePacketLoss: number;
}

export interface QualityStats {
  videoQualityDistribution: Record<VideoQuality, number>;
  audioQualityScore: number;
  reconnectionCount: number;
  averageJitterMs: number;
}

export interface BandwidthMeasurement {
  id: string;
  participantId: string;
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
  packetLossPercent: number;
  jitterMs: number;
  recommendedQuality: VideoQuality;
  measuredAt: Date;
}

export interface VirtualBackground {
  id: string;
  userId: string;
  name: string;
  backgroundType: BackgroundType;
  imageUrl?: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface SignalingConnection {
  id: string;
  roomId: string;
  participantId: string;
  socketId: string;
  peerConnectionState?: string;
  iceConnectionState?: string;
  signalingState?: string;
  lastHeartbeat?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// WebRTC Types
export interface RTCConfig {
  iceServers: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
  bundlePolicy?: RTCBundlePolicy;
  rtcpMuxPolicy?: RTCRtcpMuxPolicy;
}

export interface MediaConstraints {
  audio: boolean | MediaTrackConstraints;
  video: boolean | MediaTrackConstraints;
}

export interface VideoConstraints extends MediaTrackConstraints {
  width?: ConstrainULong;
  height?: ConstrainULong;
  frameRate?: ConstrainULong;
  facingMode?: ConstrainDOMString;
}

export interface AudioConstraints extends MediaTrackConstraints {
  echoCancellation?: ConstrainBoolean;
  noiseSuppression?: ConstrainBoolean;
  autoGainControl?: ConstrainBoolean;
}

// Signaling Messages
export interface SignalingMessage {
  type: SignalingMessageType;
  from: string;
  to?: string;
  roomId: string;
  data?: any;
  timestamp: number;
}

export type SignalingMessageType =
  | 'join'
  | 'leave'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'media-state'
  | 'screen-share'
  | 'chat'
  | 'hand-raise'
  | 'poll'
  | 'reaction'
  | 'kick'
  | 'mute'
  | 'breakout-room';

export interface JoinRoomMessage {
  roomCode: string;
  displayName: string;
  userId?: string;
  password?: string;
  mediaConstraints: MediaConstraints;
}

export interface MediaStateMessage {
  peerId: string;
  audio: boolean;
  video: boolean;
  screenShare: boolean;
}

export interface ChatMessage {
  participantId: string;
  displayName: string;
  message: string;
  timestamp: number;
}

export interface ReactionMessage {
  participantId: string;
  reaction: string;
  timestamp: number;
}

// API Request/Response Types
export interface CreateRoomRequest {
  name: string;
  description?: string;
  roomType: RoomType;
  maxParticipants?: number;
  scheduledAt?: Date;
  settings?: Partial<RoomSettings>;
  password?: string;
}

export interface CreateRoomResponse {
  room: VideoCallRoom;
  roomCode: string;
  joinUrl: string;
}

export interface JoinRoomRequest {
  roomCode: string;
  displayName: string;
  password?: string;
}

export interface JoinRoomResponse {
  room: VideoCallRoom;
  participant: VideoCallParticipant;
  token: string;
  iceServers: RTCIceServer[];
}

export interface UpdateParticipantRequest {
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
  isScreenSharing?: boolean;
  isHandRaised?: boolean;
}

export interface CreatePollRequest {
  question: string;
  options: string[];
  allowMultiple?: boolean;
  isAnonymous?: boolean;
  durationMinutes?: number;
}

export interface CreateBreakoutRoomsRequest {
  count: number;
  names?: string[];
  autoAssign?: boolean;
  durationMinutes?: number;
}

export interface StartRecordingRequest {
  format?: string;
  quality?: VideoQuality;
}

export interface BandwidthTestResult {
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
  recommendedQuality: VideoQuality;
}

// Event Types
export interface VideoCallEvent {
  type: VideoCallEventType;
  roomId: string;
  data: any;
  timestamp: Date;
}

export type VideoCallEventType =
  | 'room-created'
  | 'room-started'
  | 'room-ended'
  | 'participant-joined'
  | 'participant-left'
  | 'participant-media-changed'
  | 'recording-started'
  | 'recording-stopped'
  | 'screen-share-started'
  | 'screen-share-stopped'
  | 'chat-message'
  | 'poll-created'
  | 'poll-ended'
  | 'breakout-rooms-created'
  | 'connection-quality-changed';
