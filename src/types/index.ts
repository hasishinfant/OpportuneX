// Core data types for OpportuneX platform

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  type: 'hackathon' | 'internship' | 'workshop';
  organizer: {
    name: string;
    type: 'corporate' | 'startup' | 'government' | 'academic';
    logo?: string;
  };
  requirements: {
    skills: string[];
    experience?: string;
    education?: string;
    eligibility: string[];
  };
  details: {
    mode: 'online' | 'offline' | 'hybrid';
    location?: string;
    duration?: string;
    stipend?: string;
    prizes?: string[];
  };
  timeline: {
    applicationDeadline: Date;
    startDate?: Date;
    endDate?: Date;
  };
  externalUrl: string;
  sourceId: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  location: {
    city: string;
    state: string;
    tier: 2 | 3;
  };
  academic: {
    institution: string;
    degree: string;
    year: number;
    cgpa?: number;
  };
  skills: {
    technical: string[];
    domains: string[];
    proficiencyLevel: 'beginner' | 'intermediate' | 'advanced';
  };
  preferences: {
    opportunityTypes: Array<'hackathon' | 'internship' | 'workshop'>;
    preferredMode: 'online' | 'offline' | 'hybrid' | 'any';
    maxDistance?: number;
    notifications: NotificationPreferences;
  };
  searchHistory: SearchQuery[];
  favoriteOpportunities: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  inApp: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  types: Array<'new_opportunities' | 'deadlines' | 'recommendations'>;
}

export interface SearchQuery {
  id: string;
  query: string;
  filters?: SearchFilters;
  timestamp: Date;
  resultCount: number;
}

export interface SearchFilters {
  skills?: string[];
  organizerType?: 'corporate' | 'startup' | 'government' | 'academic';
  mode?: 'online' | 'offline' | 'hybrid';
  location?: string;
  type?: 'hackathon' | 'internship' | 'workshop';
}

export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  pagination?: {
    page: number;
    limit: number;
  };
  userId?: string;
}

export interface SearchResponse {
  opportunities: Opportunity[];
  totalCount: number;
  suggestions?: string[];
  facets?: SearchFacets;
}

export interface SearchFacets {
  skills: Array<{ name: string; count: number }>;
  organizerTypes: Array<{ name: string; count: number }>;
  modes: Array<{ name: string; count: number }>;
  locations: Array<{ name: string; count: number }>;
  types: Array<{ name: string; count: number }>;
}

export interface VoiceRequest {
  audioData: Blob;
  language: 'en' | 'hi';
  userId?: string;
}

export interface VoiceResponse {
  transcription: string;
  searchQuery: string;
  confidence: number;
  followUpQuestions?: string[];
}

export interface RoadmapPhase {
  id: string;
  title: string;
  description: string;
  duration: number; // in days
  tasks: Task[];
  resources: Resource[];
  prerequisites?: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  priority: 'high' | 'medium' | 'low';
  type: 'learning' | 'practice' | 'project' | 'assessment';
  completed: boolean;
}

export interface Resource {
  id: string;
  title: string;
  type: 'article' | 'video' | 'course' | 'book' | 'practice';
  url: string;
  duration?: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  free: boolean;
}

export interface RoadmapRequest {
  opportunityId: string;
  userProfile: UserProfile;
  targetDate?: Date;
  customGoals?: string[];
}

export interface RoadmapResponse {
  roadmap: {
    id: string;
    title: string;
    description: string;
    phases: RoadmapPhase[];
    estimatedDuration: number;
    resources: Resource[];
    milestones: Milestone[];
  };
  personalizedTips: string[];
  skillGaps: string[];
  recommendedActions: string[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  completed: boolean;
  tasks: string[]; // Task IDs
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
