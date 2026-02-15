// API configuration
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api',
  TIMEOUT: 30000,
};

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH_TOKEN: '/auth/refresh',

  // Search
  SEARCH: '/search',
  SUGGESTIONS: '/search/suggestions',

  // Opportunities
  OPPORTUNITIES: '/opportunities',
  OPPORTUNITY_DETAIL: (id: string) => `/opportunities/${id}`,

  // User
  PROFILE: '/user/profile',
  UPDATE_PROFILE: '/user/profile',
  SAVED_OPPORTUNITIES: '/user/saved',

  // AI Roadmap
  GENERATE_ROADMAP: '/ai/roadmap',
  ROADMAPS: '/ai/roadmaps',

  // Voice
  VOICE_SEARCH: '/voice/search',
};
