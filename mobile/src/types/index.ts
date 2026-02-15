// Core types for OpportuneX mobile app

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
    applicationDeadline: string;
    startDate?: string;
    endDate?: string;
  };
  externalUrl: string;
  tags: string[];
  isSaved?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  location?: {
    city: string;
    state: string;
  };
  academic?: {
    institution: string;
    degree: string;
    year: number;
  };
  skills: string[];
  preferences: {
    opportunityTypes: Array<'hackathon' | 'internship' | 'workshop'>;
    preferredMode: 'online' | 'offline' | 'hybrid' | 'any';
  };
}

export interface SearchFilters {
  type?: 'hackathon' | 'internship' | 'workshop';
  mode?: 'online' | 'offline' | 'hybrid';
  skills?: string[];
  location?: string;
}

export interface RoadmapPhase {
  id: string;
  title: string;
  description: string;
  duration: number;
  tasks: Task[];
  resources: Resource[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  priority: 'high' | 'medium' | 'low';
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

export interface Roadmap {
  id: string;
  title: string;
  description: string;
  phases: RoadmapPhase[];
  estimatedDuration: number;
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
}
