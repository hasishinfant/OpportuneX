// TypeScript types for AR/VR Virtual Events

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Transform {
  position: Vector3;
  rotation: Vector3 | Quaternion;
  scale?: Vector3;
}

export interface SceneConfig {
  environment: 'indoor' | 'outdoor' | 'custom';
  lighting: {
    ambient: string;
    directional: Array<{
      color: string;
      intensity: number;
      position: Vector3;
    }>;
  };
  skybox?: string;
  floor: {
    texture?: string;
    color: string;
    size: { width: number; depth: number };
  };
  objects: Array<{
    id: string;
    type: 'mesh' | 'model' | 'primitive';
    geometry?: string;
    modelUrl?: string;
    material: {
      color?: string;
      texture?: string;
      metalness?: number;
      roughness?: number;
    };
    transform: Transform;
  }>;
}

export interface VirtualEventSpace {
  id: string;
  opportunityId?: string;
  name: string;
  description?: string;
  spaceType: 'conference' | 'exhibition' | 'networking' | 'workshop';
  maxParticipants: number;
  sceneConfig: SceneConfig;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvatarConfig {
  model: 'default' | 'custom';
  modelUrl?: string;
  appearance: {
    skinTone?: string;
    hairStyle?: string;
    hairColor?: string;
    outfit?: string;
    accessories?: string[];
  };
  animations: {
    idle: string;
    walk: string;
    talk: string;
    wave: string;
    [key: string]: string;
  };
}

export interface UserAvatar {
  id: string;
  userId: string;
  avatarConfig: AvatarConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface VirtualEventSession {
  id: string;
  spaceId: string;
  userId: string;
  sessionToken: string;
  position?: Vector3;
  rotation?: Vector3;
  isActive: boolean;
  joinedAt: Date;
  leftAt?: Date;
}

export interface BoothConfig {
  design: 'modern' | 'classic' | 'minimal' | 'custom';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  logo?: string;
  banners: string[];
  videos: Array<{
    url: string;
    position: Vector3;
    size: { width: number; height: number };
  }>;
  documents: Array<{
    title: string;
    url: string;
    thumbnail?: string;
  }>;
  representatives: Array<{
    name: string;
    role: string;
    avatar?: string;
    available: boolean;
  }>;
}

export interface VirtualBooth {
  id: string;
  spaceId: string;
  companyName: string;
  boothConfig: BoothConfig;
  position: Vector3;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArBusinessCardData {
  name: string;
  title: string;
  company: string;
  email: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  bio?: string;
  skills?: string[];
  interests?: string[];
  profileImage?: string;
}

export interface ArBusinessCard {
  id: string;
  userId: string;
  cardData: ArBusinessCardData;
  qrCodeUrl?: string;
  arMarkerId?: string;
  shareCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VirtualPresentation {
  id: string;
  spaceId: string;
  presenterId: string;
  title: string;
  description?: string;
  contentUrl?: string;
  contentType?: 'slides' | 'video' | '3d_model' | 'screen_share';
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SpatialAudioChannel {
  id: string;
  spaceId: string;
  channelName: string;
  channelType: 'proximity' | 'broadcast' | 'private';
  maxDistance?: number;
  isActive: boolean;
  createdAt: Date;
}

export interface VirtualInteraction {
  id: string;
  spaceId: string;
  userId: string;
  interactionType: 'booth_visit' | 'presentation_attend' | 'chat' | 'gesture';
  targetId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface UserDeviceCapability {
  id: string;
  userId: string;
  supportsWebxr: boolean;
  supportsAr: boolean;
  supportsVr: boolean;
  deviceType?: 'mobile' | 'desktop' | 'vr_headset';
  performanceTier?: 'low' | 'medium' | 'high';
  lastDetectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// WebXR Session Types
export interface XRSessionConfig {
  mode: 'inline' | 'immersive-vr' | 'immersive-ar';
  requiredFeatures?: string[];
  optionalFeatures?: string[];
}

// Network Messages for Real-time Sync
export interface NetworkMessage {
  type:
    | 'position'
    | 'rotation'
    | 'animation'
    | 'interaction'
    | 'voice'
    | 'chat';
  userId: string;
  spaceId: string;
  data: any;
  timestamp: number;
}

export interface PositionUpdate extends NetworkMessage {
  type: 'position';
  data: {
    position: Vector3;
    rotation: Vector3;
  };
}

export interface AnimationUpdate extends NetworkMessage {
  type: 'animation';
  data: {
    animation: string;
    loop: boolean;
  };
}

export interface InteractionMessage extends NetworkMessage {
  type: 'interaction';
  data: {
    interactionType: string;
    targetId?: string;
    metadata?: Record<string, any>;
  };
}

export interface VoiceData extends NetworkMessage {
  type: 'voice';
  data: {
    audioData: ArrayBuffer;
    position: Vector3;
  };
}

export interface ChatMessage extends NetworkMessage {
  type: 'chat';
  data: {
    message: string;
    targetUserId?: string; // For private messages
  };
}

// Performance Optimization
export interface PerformanceSettings {
  renderDistance: number;
  shadowQuality: 'off' | 'low' | 'medium' | 'high';
  textureQuality: 'low' | 'medium' | 'high';
  antialiasing: boolean;
  particleEffects: boolean;
  maxAvatars: number;
}

// AR Marker Detection
export interface ArMarker {
  id: string;
  type: 'qr' | 'image' | 'nft';
  data: string;
  size?: number;
}

export interface ArDetectionResult {
  marker: ArMarker;
  transform: Transform;
  confidence: number;
}
