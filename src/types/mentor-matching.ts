// Mentor Matching System Types

export interface MentorProfile {
  id: string;
  userId: string;
  bio?: string;
  expertiseAreas: string[];
  domains: string[];
  yearsOfExperience: number;
  currentRole?: string;
  currentCompany?: string;
  languages: string[];
  timezone?: string;
  hourlyRate?: number;
  isAvailable: boolean;
  maxMentees: number;
  currentMentees: number;
  totalSessions: number;
  averageRating: number;
  successRate: number;
  responseTimeHours: number;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MentorAvailability {
  id: string;
  mentorId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:MM format
  endTime: string;
  isActive: boolean;
  createdAt: Date;
}

export interface MentorshipRequest {
  id: string;
  studentId: string;
  mentorId?: string;
  requestType:
    | 'general'
    | 'career'
    | 'technical'
    | 'interview_prep'
    | 'project_review';
  topic: string;
  description?: string;
  preferredLanguages: string[];
  urgency: 'low' | 'normal' | 'high';
  status: 'pending' | 'matched' | 'accepted' | 'rejected' | 'cancelled';
  matchScore?: number;
  requestedAt: Date;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MentorshipSession {
  id: string;
  mentorId: string;
  studentId: string;
  requestId?: string;
  title: string;
  description?: string;
  agenda?: string;
  scheduledAt: Date;
  durationMinutes: number;
  meetingUrl?: string;
  meetingPlatform?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  startedAt?: Date;
  endedAt?: Date;
  actualDurationMinutes?: number;
  notes?: string;
  actionItems?: ActionItem[];
  followUpDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActionItem {
  id: string;
  description: string;
  dueDate?: Date;
  completed: boolean;
  completedAt?: Date;
}

export interface SessionResource {
  id: string;
  sessionId: string;
  resourceType: 'link' | 'document' | 'video' | 'code' | 'other';
  title: string;
  url?: string;
  description?: string;
  createdAt: Date;
}

export interface MentorReview {
  id: string;
  sessionId: string;
  mentorId: string;
  studentId: string;
  rating: number; // 1-5
  communicationRating?: number;
  knowledgeRating?: number;
  helpfulnessRating?: number;
  comment?: string;
  wouldRecommend: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentProgress {
  id: string;
  studentId: string;
  mentorId: string;
  goal: string;
  targetDate?: Date;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  progressPercentage: number;
  milestones?: Milestone[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  targetDate?: Date;
  completed: boolean;
  completedAt?: Date;
}

export interface MentorSpecialization {
  id: string;
  mentorId: string;
  specialization: string;
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsExperience: number;
  createdAt: Date;
}

// Matching Algorithm Types
export interface MatchingCriteria {
  studentId: string;
  skills?: string[];
  domains?: string[];
  languages?: string[];
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  availability?: {
    dayOfWeek: number;
    timeSlot: string;
  };
  requestType?: string;
  maxResults?: number;
}

export interface MentorMatch {
  mentor: MentorProfile;
  matchScore: number;
  scoreBreakdown: {
    skillMatch: number;
    domainMatch: number;
    languageMatch: number;
    availabilityMatch: number;
    experienceMatch: number;
    successRateScore: number;
    availabilityScore: number;
  };
  availableSlots?: TimeSlot[];
  reasoning: string;
}

export interface TimeSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  date?: Date;
}

// API Request/Response Types
export interface CreateMentorProfileRequest {
  bio?: string;
  expertiseAreas: string[];
  domains: string[];
  yearsOfExperience: number;
  currentRole?: string;
  currentCompany?: string;
  languages: string[];
  timezone?: string;
  hourlyRate?: number;
  maxMentees?: number;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
}

export interface UpdateMentorProfileRequest extends Partial<CreateMentorProfileRequest> {
  isAvailable?: boolean;
  responseTimeHours?: number;
}

export interface CreateMentorshipRequestRequest {
  mentorId?: string;
  requestType: string;
  topic: string;
  description?: string;
  preferredLanguages: string[];
  urgency?: string;
}

export interface ScheduleSessionRequest {
  mentorId: string;
  requestId?: string;
  title: string;
  description?: string;
  agenda?: string;
  scheduledAt: Date;
  durationMinutes?: number;
  meetingPlatform?: string;
}

export interface UpdateSessionRequest {
  status?: string;
  notes?: string;
  actionItems?: ActionItem[];
  followUpDate?: Date;
  actualDurationMinutes?: number;
}

export interface CreateReviewRequest {
  sessionId: string;
  rating: number;
  communicationRating?: number;
  knowledgeRating?: number;
  helpfulnessRating?: number;
  comment?: string;
  wouldRecommend?: boolean;
  isPublic?: boolean;
}

export interface SearchMentorsRequest {
  skills?: string[];
  domains?: string[];
  languages?: string[];
  minRating?: number;
  maxHourlyRate?: number;
  availability?: {
    dayOfWeek: number;
    timeSlot: string;
  };
  page?: number;
  limit?: number;
}

export interface MentorAnalytics {
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  averageRating: number;
  totalReviews: number;
  successRate: number;
  currentMentees: number;
  totalMentees: number;
  averageSessionDuration: number;
  responseTime: number;
  topSkills: Array<{ skill: string; count: number }>;
  monthlyStats: Array<{
    month: string;
    sessions: number;
    rating: number;
  }>;
}

export interface StudentMentorshipStats {
  totalSessions: number;
  completedSessions: number;
  activeMentors: number;
  averageRating: number;
  goalsInProgress: number;
  goalsCompleted: number;
  upcomingSessions: MentorshipSession[];
  recentSessions: MentorshipSession[];
}
