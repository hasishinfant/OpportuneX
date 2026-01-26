import type {
  ApiResponse,
  Opportunity,
  SearchQuery,
  UserProfile,
} from '../../types';

export interface UserBehavior {
  userId: string;
  searchQueries: SearchQuery[];
  clickedOpportunities: string[];
  appliedOpportunities: string[];
  favoriteOpportunities: string[];
  timeSpentOnOpportunities: { [opportunityId: string]: number };
  searchPatterns: {
    preferredSkills: string[];
    preferredTypes: Array<'hackathon' | 'internship' | 'workshop'>;
    preferredModes: Array<'online' | 'offline' | 'hybrid'>;
    searchTimes: Date[];
  };
  engagementScore: number;
  lastActive: Date;
}

export interface RecommendationScore {
  opportunityId: string;
  score: number;
  reasons: string[];
  confidence: number;
}

export interface PersonalizationMetrics {
  userId: string;
  totalRecommendations: number;
  clickThroughRate: number;
  conversionRate: number;
  averageEngagementTime: number;
  preferenceAccuracy: number;
}

export class PersonalizationService {
  private userBehaviors: Map<string, UserBehavior> = new Map();
  private opportunityInteractions: Map<string, { [userId: string]: number }> =
    new Map();

  /**
   * Analyze user behavior and update behavior profile
   */
  async analyzeUserBehavior(
    userId: string,
    interactions: {
      searchQuery?: SearchQuery;
      clickedOpportunity?: string;
      appliedOpportunity?: string;
      timeSpent?: { opportunityId: string; duration: number };
    }
  ): Promise<ApiResponse<UserBehavior>> {
    try {
      let behavior = this.userBehaviors.get(userId);

      if (!behavior) {
        behavior = {
          userId,
          searchQueries: [],
          clickedOpportunities: [],
          appliedOpportunities: [],
          favoriteOpportunities: [],
          timeSpentOnOpportunities: {},
          searchPatterns: {
            preferredSkills: [],
            preferredTypes: [],
            preferredModes: [],
            searchTimes: [],
          },
          engagementScore: 0,
          lastActive: new Date(),
        };
      }

      // Update behavior based on interactions
      if (interactions.searchQuery) {
        behavior.searchQueries.push(interactions.searchQuery);
        behavior.searchPatterns.searchTimes.push(
          interactions.searchQuery.timestamp
        );

        // Update preferred skills and types
        if (interactions.searchQuery.filters?.skills) {
          this.updatePreferences(
            behavior.searchPatterns.preferredSkills,
            interactions.searchQuery.filters.skills
          );
        }
        if (interactions.searchQuery.filters?.type) {
          this.updatePreferences(behavior.searchPatterns.preferredTypes, [
            interactions.searchQuery.filters.type,
          ]);
        }
        if (interactions.searchQuery.filters?.mode) {
          this.updatePreferences(behavior.searchPatterns.preferredModes, [
            interactions.searchQuery.filters.mode,
          ]);
        }
      }

      if (interactions.clickedOpportunity) {
        behavior.clickedOpportunities.push(interactions.clickedOpportunity);
        this.updateOpportunityInteraction(
          interactions.clickedOpportunity,
          userId,
          1
        );
      }

      if (interactions.appliedOpportunity) {
        behavior.appliedOpportunities.push(interactions.appliedOpportunity);
        this.updateOpportunityInteraction(
          interactions.appliedOpportunity,
          userId,
          3
        );
      }

      if (interactions.timeSpent) {
        behavior.timeSpentOnOpportunities[
          interactions.timeSpent.opportunityId
        ] =
          (behavior.timeSpentOnOpportunities[
            interactions.timeSpent.opportunityId
          ] || 0) + interactions.timeSpent.duration;
      }

      // Update engagement score
      behavior.engagementScore = this.calculateEngagementScore(behavior);
      behavior.lastActive = new Date();

      this.userBehaviors.set(userId, behavior);

      return {
        success: true,
        data: behavior,
        message: 'User behavior analyzed and updated successfully',
      };
    } catch (error) {
      console.error('Analyze user behavior error:', error);
      return {
        success: false,
        error: 'Failed to analyze user behavior',
      };
    }
  }
  /**
   * Generate personalized recommendations using collaborative filtering
   */
  async generateCollaborativeRecommendations(
    userId: string,
    opportunities: Opportunity[],
    limit = 10
  ): Promise<ApiResponse<RecommendationScore[]>> {
    try {
      const userBehavior = this.userBehaviors.get(userId);
      if (!userBehavior) {
        return {
          success: false,
          error: 'User behavior data not found',
        };
      }

      const recommendations: RecommendationScore[] = [];

      // Find similar users based on behavior patterns
      const similarUsers = this.findSimilarUsers(userId, userBehavior);

      for (const opportunity of opportunities) {
        let score = 0;
        const reasons: string[] = [];

        // Collaborative filtering score
        const collaborativeScore = this.calculateCollaborativeScore(
          opportunity.id,
          similarUsers,
          userBehavior
        );
        score += collaborativeScore * 0.4;

        if (collaborativeScore > 0.5) {
          reasons.push(
            'Users with similar interests engaged with this opportunity'
          );
        }

        // Content-based filtering score
        const contentScore = this.calculateContentBasedScore(
          opportunity,
          userBehavior
        );
        score += contentScore * 0.6;

        if (contentScore > 0.7) {
          reasons.push('Matches your skill preferences and interests');
        }

        // Boost score for preferred types and modes
        if (
          userBehavior.searchPatterns.preferredTypes.includes(opportunity.type)
        ) {
          score += 0.2;
          reasons.push(
            `Matches your preferred opportunity type: ${opportunity.type}`
          );
        }

        if (
          userBehavior.searchPatterns.preferredModes.includes(
            opportunity.details.mode
          )
        ) {
          score += 0.1;
          reasons.push(
            `Matches your preferred mode: ${opportunity.details.mode}`
          );
        }

        // Penalize if user has already seen/applied
        if (userBehavior.clickedOpportunities.includes(opportunity.id)) {
          score *= 0.5;
        }
        if (userBehavior.appliedOpportunities.includes(opportunity.id)) {
          score *= 0.1;
        }

        const confidence = Math.min(score, 1.0);

        if (score > 0.3) {
          // Only include recommendations with decent scores
          recommendations.push({
            opportunityId: opportunity.id,
            score,
            reasons,
            confidence,
          });
        }
      }

      // Sort by score and limit results
      recommendations.sort((a, b) => b.score - a.score);
      const limitedRecommendations = recommendations.slice(0, limit);

      return {
        success: true,
        data: limitedRecommendations,
        message: 'Collaborative recommendations generated successfully',
      };
    } catch (error) {
      console.error('Generate collaborative recommendations error:', error);
      return {
        success: false,
        error: 'Failed to generate collaborative recommendations',
      };
    }
  }

  /**
   * Generate content-based recommendations
   */
  async generateContentBasedRecommendations(
    userProfile: UserProfile,
    opportunities: Opportunity[],
    limit = 10
  ): Promise<ApiResponse<RecommendationScore[]>> {
    try {
      const recommendations: RecommendationScore[] = [];

      for (const opportunity of opportunities) {
        let score = 0;
        const reasons: string[] = [];

        // Skill matching
        const skillMatch = this.calculateSkillMatch(
          userProfile.skills.technical,
          opportunity.requirements.skills
        );
        score += skillMatch * 0.4;

        if (skillMatch > 0.7) {
          reasons.push('Strong match with your technical skills');
        } else if (skillMatch > 0.4) {
          reasons.push('Partial match with your technical skills');
        }

        // Opportunity type preference
        if (
          userProfile.preferences.opportunityTypes.includes(opportunity.type)
        ) {
          score += 0.3;
          reasons.push(
            `Matches your preferred opportunity type: ${opportunity.type}`
          );
        }

        // Mode preference
        if (
          userProfile.preferences.preferredMode === 'any' ||
          userProfile.preferences.preferredMode === opportunity.details.mode
        ) {
          score += 0.2;
          reasons.push(
            `Matches your preferred mode: ${opportunity.details.mode}`
          );
        }

        // Location preference (for offline/hybrid opportunities)
        if (
          opportunity.details.mode !== 'online' &&
          opportunity.details.location
        ) {
          const locationMatch = this.calculateLocationMatch(
            userProfile.location,
            opportunity.details.location
          );
          score += locationMatch * 0.1;

          if (locationMatch > 0.8) {
            reasons.push('Located in your preferred area');
          }
        }

        const confidence = Math.min(score, 1.0);

        if (score > 0.3) {
          recommendations.push({
            opportunityId: opportunity.id,
            score,
            reasons,
            confidence,
          });
        }
      }

      // Sort by score and limit results
      recommendations.sort((a, b) => b.score - a.score);
      const limitedRecommendations = recommendations.slice(0, limit);

      return {
        success: true,
        data: limitedRecommendations,
        message: 'Content-based recommendations generated successfully',
      };
    } catch (error) {
      console.error('Generate content-based recommendations error:', error);
      return {
        success: false,
        error: 'Failed to generate content-based recommendations',
      };
    }
  }

  /**
   * Create personalized search ranking
   */
  async personalizeSearchResults(
    userId: string,
    searchResults: Opportunity[],
    userProfile: UserProfile
  ): Promise<ApiResponse<Opportunity[]>> {
    try {
      const userBehavior = this.userBehaviors.get(userId);

      // Calculate personalization scores for each opportunity
      const scoredResults = searchResults.map(opportunity => {
        let personalizedScore = 0;

        // Base relevance score (assumed to be already calculated by search engine)
        personalizedScore += 0.5;

        // User behavior influence
        if (userBehavior) {
          const behaviorScore = this.calculateBehaviorInfluence(
            opportunity,
            userBehavior
          );
          personalizedScore += behaviorScore * 0.3;
        }

        // Profile-based influence
        const profileScore = this.calculateProfileInfluence(
          opportunity,
          userProfile
        );
        personalizedScore += profileScore * 0.2;

        return {
          ...opportunity,
          personalizedScore,
        };
      });

      // Sort by personalized score
      const personalizedResults = scoredResults
        .sort((a, b) => b.personalizedScore - a.personalizedScore)
        .map(({ personalizedScore, ...opportunity }) => opportunity);

      return {
        success: true,
        data: personalizedResults,
        message: 'Search results personalized successfully',
      };
    } catch (error) {
      console.error('Personalize search results error:', error);
      return {
        success: false,
        error: 'Failed to personalize search results',
      };
    }
  }

  /**
   * Get personalization metrics for A/B testing
   */
  async getPersonalizationMetrics(
    userId: string
  ): Promise<ApiResponse<PersonalizationMetrics>> {
    try {
      const userBehavior = this.userBehaviors.get(userId);

      if (!userBehavior) {
        return {
          success: false,
          error: 'User behavior data not found',
        };
      }

      const metrics: PersonalizationMetrics = {
        userId,
        totalRecommendations: userBehavior.clickedOpportunities.length,
        clickThroughRate: this.calculateClickThroughRate(userBehavior),
        conversionRate: this.calculateConversionRate(userBehavior),
        averageEngagementTime:
          this.calculateAverageEngagementTime(userBehavior),
        preferenceAccuracy: this.calculatePreferenceAccuracy(userBehavior),
      };

      return {
        success: true,
        data: metrics,
        message: 'Personalization metrics retrieved successfully',
      };
    } catch (error) {
      console.error('Get personalization metrics error:', error);
      return {
        success: false,
        error: 'Failed to retrieve personalization metrics',
      };
    }
  }

  // Private helper methods

  private updatePreferences<T>(preferences: T[], newItems: T[]): void {
    for (const item of newItems) {
      if (!preferences.includes(item)) {
        preferences.push(item);
      }
    }
    // Keep only the most recent 10 preferences
    if (preferences.length > 10) {
      preferences.splice(0, preferences.length - 10);
    }
  }

  private updateOpportunityInteraction(
    opportunityId: string,
    userId: string,
    weight: number
  ): void {
    if (!this.opportunityInteractions.has(opportunityId)) {
      this.opportunityInteractions.set(opportunityId, {});
    }
    const interactions = this.opportunityInteractions.get(opportunityId)!;
    interactions[userId] = (interactions[userId] || 0) + weight;
  }

  private calculateEngagementScore(behavior: UserBehavior): number {
    let score = 0;

    // Search activity (max 30 points)
    score += Math.min(behavior.searchQueries.length * 2, 30);

    // Click activity (max 40 points)
    score += Math.min(behavior.clickedOpportunities.length * 4, 40);

    // Application activity (max 30 points)
    score += Math.min(behavior.appliedOpportunities.length * 10, 30);

    return Math.min(score, 100);
  }

  private findSimilarUsers(
    userId: string,
    userBehavior: UserBehavior
  ): string[] {
    const similarUsers: Array<{ userId: string; similarity: number }> = [];

    for (const [otherUserId, otherBehavior] of this.userBehaviors.entries()) {
      if (otherUserId === userId) continue;

      const similarity = this.calculateUserSimilarity(
        userBehavior,
        otherBehavior
      );
      if (similarity > 0.3) {
        similarUsers.push({ userId: otherUserId, similarity });
      }
    }

    return similarUsers
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10)
      .map(u => u.userId);
  }

  private calculateUserSimilarity(
    behavior1: UserBehavior,
    behavior2: UserBehavior
  ): number {
    let similarity = 0;

    // Skill preferences similarity
    const skillSimilarity = this.calculateArraySimilarity(
      behavior1.searchPatterns.preferredSkills,
      behavior2.searchPatterns.preferredSkills
    );
    similarity += skillSimilarity * 0.4;

    // Type preferences similarity
    const typeSimilarity = this.calculateArraySimilarity(
      behavior1.searchPatterns.preferredTypes,
      behavior2.searchPatterns.preferredTypes
    );
    similarity += typeSimilarity * 0.3;

    // Mode preferences similarity
    const modeSimilarity = this.calculateArraySimilarity(
      behavior1.searchPatterns.preferredModes,
      behavior2.searchPatterns.preferredModes
    );
    similarity += modeSimilarity * 0.3;

    return similarity;
  }

  private calculateArraySimilarity<T>(arr1: T[], arr2: T[]): number {
    if (arr1.length === 0 && arr2.length === 0) return 1;
    if (arr1.length === 0 || arr2.length === 0) return 0;

    const intersection = arr1.filter(item => arr2.includes(item));
    const union = [...new Set([...arr1, ...arr2])];

    return intersection.length / union.length;
  }

  private calculateCollaborativeScore(
    opportunityId: string,
    similarUsers: string[],
    userBehavior: UserBehavior
  ): number {
    const interactions = this.opportunityInteractions.get(opportunityId);
    if (!interactions) return 0;

    let totalScore = 0;
    let userCount = 0;

    for (const similarUserId of similarUsers) {
      if (interactions[similarUserId]) {
        totalScore += interactions[similarUserId];
        userCount++;
      }
    }

    return userCount > 0 ? totalScore / (userCount * 3) : 0; // Normalize by max interaction weight
  }

  private calculateContentBasedScore(
    opportunity: Opportunity,
    userBehavior: UserBehavior
  ): number {
    let score = 0;

    // Skill match
    const skillMatch = this.calculateSkillMatch(
      userBehavior.searchPatterns.preferredSkills,
      opportunity.requirements.skills
    );
    score += skillMatch * 0.5;

    // Type preference
    if (userBehavior.searchPatterns.preferredTypes.includes(opportunity.type)) {
      score += 0.3;
    }

    // Mode preference
    if (
      userBehavior.searchPatterns.preferredModes.includes(
        opportunity.details.mode
      )
    ) {
      score += 0.2;
    }

    return score;
  }

  private calculateSkillMatch(
    userSkills: string[],
    requiredSkills: string[]
  ): number {
    if (userSkills.length === 0 || requiredSkills.length === 0) return 0;

    const matchingSkills = userSkills.filter(skill =>
      requiredSkills.some(
        required =>
          skill.toLowerCase().includes(required.toLowerCase()) ||
          required.toLowerCase().includes(skill.toLowerCase())
      )
    );

    return matchingSkills.length / requiredSkills.length;
  }

  private calculateLocationMatch(
    userLocation: any,
    opportunityLocation: string
  ): number {
    // Simple location matching - in production, this would use geolocation APIs
    const userCity = userLocation.city.toLowerCase();
    const userState = userLocation.state.toLowerCase();
    const oppLocation = opportunityLocation.toLowerCase();

    if (oppLocation.includes(userCity)) return 1.0;
    if (oppLocation.includes(userState)) return 0.7;
    return 0.3; // Default for same country
  }

  private calculateBehaviorInfluence(
    opportunity: Opportunity,
    userBehavior: UserBehavior
  ): number {
    let influence = 0;

    // Recent search patterns
    const recentSearches = userBehavior.searchQueries.slice(-5);
    for (const search of recentSearches) {
      if (
        search.filters?.skills?.some(skill =>
          opportunity.requirements.skills.includes(skill)
        )
      ) {
        influence += 0.2;
      }
      if (search.filters?.type === opportunity.type) {
        influence += 0.3;
      }
    }

    return Math.min(influence, 1.0);
  }

  private calculateProfileInfluence(
    opportunity: Opportunity,
    userProfile: UserProfile
  ): number {
    let influence = 0;

    // Skill match
    const skillMatch = this.calculateSkillMatch(
      userProfile.skills.technical,
      opportunity.requirements.skills
    );
    influence += skillMatch * 0.6;

    // Preference match
    if (userProfile.preferences.opportunityTypes.includes(opportunity.type)) {
      influence += 0.4;
    }

    return Math.min(influence, 1.0);
  }

  private calculateClickThroughRate(userBehavior: UserBehavior): number {
    const totalSearches = userBehavior.searchQueries.length;
    const totalClicks = userBehavior.clickedOpportunities.length;

    return totalSearches > 0 ? totalClicks / totalSearches : 0;
  }

  private calculateConversionRate(userBehavior: UserBehavior): number {
    const totalClicks = userBehavior.clickedOpportunities.length;
    const totalApplications = userBehavior.appliedOpportunities.length;

    return totalClicks > 0 ? totalApplications / totalClicks : 0;
  }

  private calculateAverageEngagementTime(userBehavior: UserBehavior): number {
    const timeValues = Object.values(userBehavior.timeSpentOnOpportunities);
    if (timeValues.length === 0) return 0;

    const totalTime = timeValues.reduce((sum, time) => sum + time, 0);
    return totalTime / timeValues.length;
  }

  private calculatePreferenceAccuracy(userBehavior: UserBehavior): number {
    // This would be calculated based on user feedback in a real system
    // For now, return a mock value based on engagement
    return Math.min(userBehavior.engagementScore / 100, 1.0);
  }
}

export const personalizationService = new PersonalizationService();
