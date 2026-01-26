// Application constants for OpportuneX

export const APP_CONFIG = {
  name: 'OpportuneX',
  description: 'AI-powered opportunity discovery platform for students',
  version: '0.1.0',
  author: 'OpportuneX Team',
} as const;

export const API_ROUTES = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    RESET_PASSWORD: '/api/auth/reset-password',
  },
  // Search
  SEARCH: {
    OPPORTUNITIES: '/api/search/opportunities',
    SUGGESTIONS: '/api/search/suggestions',
    VOICE: '/api/search/voice',
  },
  // User Management
  USER: {
    PROFILE: '/api/user/profile',
    PREFERENCES: '/api/user/preferences',
    HISTORY: '/api/user/history',
    FAVORITES: '/api/user/favorites',
  },
  // AI Instructor
  AI: {
    ROADMAP: '/api/ai/roadmap',
    RECOMMENDATIONS: '/api/ai/recommendations',
  },
  // Notifications
  NOTIFICATIONS: {
    LIST: '/api/notifications',
    MARK_READ: '/api/notifications/read',
    PREFERENCES: '/api/notifications/preferences',
  },
} as const;

export const OPPORTUNITY_TYPES = {
  HACKATHON: 'hackathon',
  INTERNSHIP: 'internship',
  WORKSHOP: 'workshop',
} as const;

export const ORGANIZER_TYPES = {
  CORPORATE: 'corporate',
  STARTUP: 'startup',
  GOVERNMENT: 'government',
  ACADEMIC: 'academic',
} as const;

export const OPPORTUNITY_MODES = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  HYBRID: 'hybrid',
} as const;

export const SKILL_PROFICIENCY_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

export const NOTIFICATION_TYPES = {
  NEW_OPPORTUNITIES: 'new_opportunities',
  DEADLINES: 'deadlines',
  RECOMMENDATIONS: 'recommendations',
} as const;

export const NOTIFICATION_FREQUENCIES = {
  IMMEDIATE: 'immediate',
  DAILY: 'daily',
  WEEKLY: 'weekly',
} as const;

export const SUPPORTED_LANGUAGES = {
  ENGLISH: 'en',
  HINDI: 'hi',
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const SEARCH_DEFAULTS = {
  DEBOUNCE_DELAY: 300, // milliseconds
  MIN_QUERY_LENGTH: 2,
  MAX_SUGGESTIONS: 5,
} as const;

export const CACHE_KEYS = {
  USER_PROFILE: 'user:profile',
  SEARCH_RESULTS: 'search:results',
  OPPORTUNITIES: 'opportunities',
  SUGGESTIONS: 'search:suggestions',
} as const;

export const CACHE_TTL = {
  SHORT: 5 * 60, // 5 minutes
  MEDIUM: 30 * 60, // 30 minutes
  LONG: 24 * 60 * 60, // 24 hours
} as const;

export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  QUERY_MAX_LENGTH: 500,
  DESCRIPTION_MAX_LENGTH: 2000,
} as const;

export const TIER_CITIES = {
  TIER_2: 2,
  TIER_3: 3,
} as const;

export const ERROR_MESSAGES = {
  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You need to be logged in to access this feature.',
  FORBIDDEN: 'You do not have permission to access this resource.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  RATE_LIMIT: 'Too many requests. Please try again later.',
} as const;

export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Profile updated successfully',
  PREFERENCES_SAVED: 'Preferences saved successfully',
  OPPORTUNITY_FAVORITED: 'Opportunity added to favorites',
  OPPORTUNITY_UNFAVORITED: 'Opportunity removed from favorites',
  NOTIFICATION_MARKED_READ: 'Notification marked as read',
} as const;
