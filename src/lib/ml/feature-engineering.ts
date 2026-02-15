/**
 * Feature Engineering for ML-Based Opportunity Scoring
 *
 * This module extracts and transforms features from user profiles and opportunities
 * to create input vectors for the ML scoring model.
 */

import type { Opportunity, UserProfile } from '@/types';

export interface OpportunityFeatures {
  // User-Opportunity Match Features
  skillMatchScore: number;
  locationMatchScore: number;
  modeMatchScore: number;
  typeMatchScore: number;
  proficiencyMatchScore: number;

  // Opportunity Quality Features
  organizerTypeScore: number;
  deadlineUrgency: number;
  opportunityAge: number;
  qualityScore: number;

  // User Behavior Features
  historicalInterestScore: number;
  similarOpportunityEngagement: number;

  // Temporal Features
  daysUntilDeadline: number;
  isWeekend: boolean;
  hourOfDay: number;

  // Composite Features
  overallRelevanceScore: number;
}

export interface UserInteractionData {
  userId: string;
  opportunityId: string;
  clicked: boolean;
  applied: boolean;
  favorited: boolean;
  timeSpent: number; // seconds
  timestamp: Date;
}

/**
 * Extract features from user profile and opportunity for ML model
 */
export function extractFeatures(
  user: UserProfile,
  opportunity: Opportunity,
  userHistory?: UserInteractionData[]
): OpportunityFeatures {
  return {
    skillMatchScore: calculateSkillMatch(user, opportunity),
    locationMatchScore: calculateLocationMatch(user, opportunity),
    modeMatchScore: calculateModeMatch(user, opportunity),
    typeMatchScore: calculateTypeMatch(user, opportunity),
    proficiencyMatchScore: calculateProficiencyMatch(user, opportunity),
    organizerTypeScore: scoreOrganizerType(opportunity.organizer.type),
    deadlineUrgency: calculateDeadlineUrgency(
      opportunity.timeline.applicationDeadline
    ),
    opportunityAge: calculateOpportunityAge(opportunity.createdAt),
    qualityScore: (opportunity as any).qualityScore || 0,
    historicalInterestScore: calculateHistoricalInterest(
      user,
      opportunity,
      userHistory
    ),
    similarOpportunityEngagement: calculateSimilarEngagement(
      user,
      opportunity,
      userHistory
    ),
    daysUntilDeadline: calculateDaysUntilDeadline(
      opportunity.timeline.applicationDeadline
    ),
    isWeekend: isWeekendDay(new Date()),
    hourOfDay: new Date().getHours(),
    overallRelevanceScore: 0, // Calculated by model
  };
}

/**
 * Calculate skill match score between user and opportunity
 * Returns value between 0 and 1
 */
function calculateSkillMatch(
  user: UserProfile,
  opportunity: Opportunity
): number {
  const userSkills = new Set(user.skills.technical.map(s => s.toLowerCase()));
  const requiredSkills = opportunity.requirements.skills.map(s =>
    s.toLowerCase()
  );

  if (requiredSkills.length === 0) return 0.5; // Neutral if no skills required

  const matchedSkills = requiredSkills.filter(skill => userSkills.has(skill));
  const matchRatio = matchedSkills.length / requiredSkills.length;

  // Bonus for having more skills than required
  const extraSkillsBonus = Math.min(
    0.2,
    (userSkills.size - matchedSkills.length) * 0.02
  );

  return Math.min(1.0, matchRatio + extraSkillsBonus);
}

/**
 * Calculate location match score
 * Returns value between 0 and 1
 */
function calculateLocationMatch(
  user: UserProfile,
  opportunity: Opportunity
): number {
  // Online opportunities are always a match
  if (opportunity.details.mode === 'online') return 1.0;

  // If no location specified for opportunity, neutral score
  if (!opportunity.details.location) return 0.5;

  const userCity = user.location.city.toLowerCase();
  const userState = user.location.state.toLowerCase();
  const oppLocation = opportunity.details.location.toLowerCase();

  // Exact city match
  if (oppLocation.includes(userCity)) return 1.0;

  // Same state
  if (oppLocation.includes(userState)) return 0.7;

  // Hybrid mode gets partial credit
  if (opportunity.details.mode === 'hybrid') return 0.6;

  // Different location, offline
  return 0.2;
}

/**
 * Calculate mode preference match
 * Returns value between 0 and 1
 */
function calculateModeMatch(
  user: UserProfile,
  opportunity: Opportunity
): number {
  if (user.preferences.preferredMode === 'any') return 1.0;

  if (user.preferences.preferredMode === opportunity.details.mode) return 1.0;

  // Hybrid mode gets partial credit
  if (opportunity.details.mode === 'hybrid') return 0.8;
  if (user.preferences.preferredMode === 'hybrid') return 0.8;

  return 0.4;
}

/**
 * Calculate opportunity type match
 * Returns value between 0 and 1
 */
function calculateTypeMatch(
  user: UserProfile,
  opportunity: Opportunity
): number {
  if (user.preferences.opportunityTypes.length === 0) return 0.5;

  return user.preferences.opportunityTypes.includes(opportunity.type)
    ? 1.0
    : 0.3;
}

/**
 * Calculate proficiency level match
 * Returns value between 0 and 1
 */
function calculateProficiencyMatch(
  user: UserProfile,
  opportunity: Opportunity
): number {
  const userLevel = user.skills.proficiencyLevel;

  // Map proficiency levels to numeric values
  const levelMap: Record<string, number> = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
  };

  const userLevelNum = levelMap[userLevel];

  // Estimate opportunity difficulty from requirements
  const requiredSkillsCount = opportunity.requirements.skills.length;
  const hasExperienceReq = !!opportunity.requirements.experience;

  let oppDifficulty = 1; // Default to beginner
  if (requiredSkillsCount > 5 || hasExperienceReq) oppDifficulty = 2;
  if (requiredSkillsCount > 10 && hasExperienceReq) oppDifficulty = 3;

  // Perfect match
  if (userLevelNum === oppDifficulty) return 1.0;

  // One level difference
  if (Math.abs(userLevelNum - oppDifficulty) === 1) return 0.7;

  // Two levels difference
  return 0.4;
}

/**
 * Score organizer type (some types may be more prestigious)
 * Returns value between 0 and 1
 */
function scoreOrganizerType(type: string): number {
  const scores: Record<string, number> = {
    corporate: 0.9,
    startup: 0.7,
    government: 0.8,
    academic: 0.75,
  };

  return scores[type] || 0.5;
}

/**
 * Calculate deadline urgency (closer deadlines may be more urgent)
 * Returns value between 0 and 1
 */
function calculateDeadlineUrgency(deadline: Date): number {
  const now = new Date();
  const daysUntil =
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (daysUntil < 0) return 0; // Past deadline
  if (daysUntil < 3) return 1.0; // Very urgent
  if (daysUntil < 7) return 0.8; // Urgent
  if (daysUntil < 14) return 0.6; // Moderate
  if (daysUntil < 30) return 0.4; // Some time

  return 0.2; // Plenty of time
}

/**
 * Calculate opportunity age (newer opportunities may be more relevant)
 * Returns value between 0 and 1
 */
function calculateOpportunityAge(createdAt: Date): number {
  const now = new Date();
  const ageInDays =
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  if (ageInDays < 1) return 1.0; // Brand new
  if (ageInDays < 7) return 0.9; // Recent
  if (ageInDays < 14) return 0.7; // Somewhat recent
  if (ageInDays < 30) return 0.5; // Older

  return 0.3; // Old
}

/**
 * Calculate historical interest based on user's past interactions
 * Returns value between 0 and 1
 */
function calculateHistoricalInterest(
  user: UserProfile,
  opportunity: Opportunity,
  history?: UserInteractionData[]
): number {
  if (!history || history.length === 0) return 0.5; // Neutral for new users

  // Find similar opportunities user interacted with
  const similarInteractions = history.filter(h => {
    // This would need actual opportunity data to compare
    // For now, use a simplified version
    return true;
  });

  if (similarInteractions.length === 0) return 0.5;

  // Calculate engagement score
  const engagementScore =
    similarInteractions.reduce((sum, interaction) => {
      let score = 0;
      if (interaction.clicked) score += 0.2;
      if (interaction.favorited) score += 0.3;
      if (interaction.applied) score += 0.5;
      if (interaction.timeSpent > 60) score += 0.2; // Spent more than 1 minute
      return sum + score;
    }, 0) / similarInteractions.length;

  return Math.min(1.0, engagementScore);
}

/**
 * Calculate engagement with similar opportunities
 * Returns value between 0 and 1
 */
function calculateSimilarEngagement(
  user: UserProfile,
  opportunity: Opportunity,
  history?: UserInteractionData[]
): number {
  if (!history || history.length === 0) return 0.5;

  // This would need more sophisticated similarity calculation
  // For now, return neutral score
  return 0.5;
}

/**
 * Calculate days until deadline
 */
function calculateDaysUntilDeadline(deadline: Date): number {
  const now = new Date();
  const daysUntil =
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.round(daysUntil));
}

/**
 * Check if current day is weekend
 */
function isWeekendDay(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Normalize features to 0-1 range for ML model input
 */
export function normalizeFeatures(features: OpportunityFeatures): number[] {
  return [
    features.skillMatchScore,
    features.locationMatchScore,
    features.modeMatchScore,
    features.typeMatchScore,
    features.proficiencyMatchScore,
    features.organizerTypeScore,
    features.deadlineUrgency,
    features.opportunityAge,
    features.qualityScore / 100, // Assuming quality score is 0-100
    features.historicalInterestScore,
    features.similarOpportunityEngagement,
    features.daysUntilDeadline / 90, // Normalize to 90 days max
    features.isWeekend ? 1 : 0,
    features.hourOfDay / 24,
  ];
}

/**
 * Create feature vector for batch processing
 */
export function createFeatureMatrix(
  users: UserProfile[],
  opportunities: Opportunity[],
  historyMap?: Map<string, UserInteractionData[]>
): number[][] {
  const matrix: number[][] = [];

  for (const user of users) {
    for (const opportunity of opportunities) {
      const history = historyMap?.get(user.id);
      const features = extractFeatures(user, opportunity, history);
      const normalized = normalizeFeatures(features);
      matrix.push(normalized);
    }
  }

  return matrix;
}
