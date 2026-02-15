/**
 * ML-Based Opportunity Scoring Service
 *
 * This service provides machine learning-based scoring for opportunities
 * to improve recommendation quality and search ranking.
 */

import type { Opportunity, UserProfile } from '@/types';
import {
  extractFeatures,
  normalizeFeatures,
  type OpportunityFeatures,
  type UserInteractionData,
} from '../ml/feature-engineering';

export interface ScoredOpportunity extends Opportunity {
  mlScore: number;
  scoreBreakdown: {
    relevance: number;
    quality: number;
    urgency: number;
    personalization: number;
  };
}

export interface ScoringOptions {
  includeBreakdown?: boolean;
  minScore?: number;
  maxResults?: number;
}

/**
 * ML Scoring Service
 *
 * Provides opportunity scoring using machine learning features
 * Currently uses a weighted feature approach; can be upgraded to trained ML model
 */
export class MLScoringService {
  private modelWeights: number[];
  private userInteractionCache: Map<string, UserInteractionData[]>;

  constructor() {
    // Initialize with default weights (can be replaced with trained model weights)
    this.modelWeights = [
      0.25, // skillMatchScore
      0.15, // locationMatchScore
      0.1, // modeMatchScore
      0.1, // typeMatchScore
      0.08, // proficiencyMatchScore
      0.05, // organizerTypeScore
      0.08, // deadlineUrgency
      0.03, // opportunityAge
      0.05, // qualityScore
      0.06, // historicalInterestScore
      0.03, // similarOpportunityEngagement
      0.01, // daysUntilDeadline
      0.005, // isWeekend
      0.005, // hourOfDay
    ];

    this.userInteractionCache = new Map();
  }

  /**
   * Score a single opportunity for a user
   */
  async scoreOpportunity(
    user: UserProfile,
    opportunity: Opportunity,
    options: ScoringOptions = {}
  ): Promise<ScoredOpportunity> {
    const userHistory = this.userInteractionCache.get(user.id);
    const features = extractFeatures(user, opportunity, userHistory);
    const normalizedFeatures = normalizeFeatures(features);

    // Calculate weighted score
    const mlScore = this.calculateWeightedScore(normalizedFeatures);

    const scoredOpportunity: ScoredOpportunity = {
      ...opportunity,
      mlScore,
      scoreBreakdown: options.includeBreakdown
        ? this.calculateScoreBreakdown(features)
        : { relevance: 0, quality: 0, urgency: 0, personalization: 0 },
    };

    return scoredOpportunity;
  }

  /**
   * Score multiple opportunities for a user and return sorted by score
   */
  async scoreOpportunities(
    user: UserProfile,
    opportunities: Opportunity[],
    options: ScoringOptions = {}
  ): Promise<ScoredOpportunity[]> {
    const scored = await Promise.all(
      opportunities.map(opp => this.scoreOpportunity(user, opp, options))
    );

    // Filter by minimum score if specified
    let filtered = scored;
    if (options.minScore !== undefined) {
      filtered = scored.filter(opp => opp.mlScore >= options.minScore);
    }

    // Sort by score descending
    filtered.sort((a, b) => b.mlScore - a.mlScore);

    // Limit results if specified
    if (options.maxResults !== undefined) {
      filtered = filtered.slice(0, options.maxResults);
    }

    return filtered;
  }

  /**
   * Calculate weighted score from normalized features
   */
  private calculateWeightedScore(features: number[]): number {
    if (features.length !== this.modelWeights.length) {
      throw new Error('Feature vector length does not match model weights');
    }

    let score = 0;
    for (let i = 0; i < features.length; i++) {
      score += features[i] * this.modelWeights[i];
    }

    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate detailed score breakdown for explainability
   */
  private calculateScoreBreakdown(features: OpportunityFeatures): {
    relevance: number;
    quality: number;
    urgency: number;
    personalization: number;
  } {
    // Relevance: skill match, type match, mode match
    const relevance =
      features.skillMatchScore * 0.5 +
      features.typeMatchScore * 0.3 +
      features.modeMatchScore * 0.2;

    // Quality: organizer type, quality score
    const quality =
      features.organizerTypeScore * 0.4 + (features.qualityScore / 100) * 0.6;

    // Urgency: deadline urgency, days until deadline
    const urgency =
      features.deadlineUrgency * 0.7 +
      (1 - features.daysUntilDeadline / 90) * 0.3;

    // Personalization: historical interest, location match, proficiency match
    const personalization =
      features.historicalInterestScore * 0.4 +
      features.locationMatchScore * 0.3 +
      features.proficiencyMatchScore * 0.3;

    return {
      relevance: Math.round(relevance * 100) / 100,
      quality: Math.round(quality * 100) / 100,
      urgency: Math.round(urgency * 100) / 100,
      personalization: Math.round(personalization * 100) / 100,
    };
  }

  /**
   * Update user interaction history for better scoring
   */
  async recordInteraction(interaction: UserInteractionData): Promise<void> {
    const userHistory = this.userInteractionCache.get(interaction.userId) || [];
    userHistory.push(interaction);

    // Keep only last 100 interactions per user
    if (userHistory.length > 100) {
      userHistory.shift();
    }

    this.userInteractionCache.set(interaction.userId, userHistory);

    // In production, this should also persist to database
    // await this.persistInteraction(interaction);
  }

  /**
   * Load user interaction history from database
   */
  async loadUserHistory(userId: string): Promise<void> {
    // In production, load from database
    // const history = await db.getUserInteractions(userId);
    // this.userInteractionCache.set(userId, history);

    // For now, just initialize empty
    if (!this.userInteractionCache.has(userId)) {
      this.userInteractionCache.set(userId, []);
    }
  }

  /**
   * Update model weights (for when we train a new model)
   */
  updateModelWeights(newWeights: number[]): void {
    if (newWeights.length !== this.modelWeights.length) {
      throw new Error('New weights must have same length as current weights');
    }

    this.modelWeights = newWeights;
  }

  /**
   * Get current model weights
   */
  getModelWeights(): number[] {
    return [...this.modelWeights];
  }

  /**
   * Batch score opportunities for multiple users (for recommendations)
   */
  async batchScore(
    users: UserProfile[],
    opportunities: Opportunity[]
  ): Promise<Map<string, ScoredOpportunity[]>> {
    const results = new Map<string, ScoredOpportunity[]>();

    for (const user of users) {
      const scored = await this.scoreOpportunities(user, opportunities, {
        maxResults: 50, // Limit to top 50 per user
      });
      results.set(user.id, scored);
    }

    return results;
  }

  /**
   * Get personalized recommendations for a user
   */
  async getRecommendations(
    user: UserProfile,
    candidateOpportunities: Opportunity[],
    count: number = 10
  ): Promise<ScoredOpportunity[]> {
    return this.scoreOpportunities(user, candidateOpportunities, {
      maxResults: count,
      minScore: 0.3, // Only recommend opportunities with decent score
      includeBreakdown: true,
    });
  }

  /**
   * Re-rank search results using ML scores
   */
  async reRankSearchResults(
    user: UserProfile,
    searchResults: Opportunity[],
    options: { blendWeight?: number } = {}
  ): Promise<ScoredOpportunity[]> {
    const blendWeight = options.blendWeight ?? 0.7; // 70% ML score, 30% original ranking

    const scored = await this.scoreOpportunities(user, searchResults, {
      includeBreakdown: false,
    });

    // Blend ML score with original ranking
    scored.forEach((opp, index) => {
      const originalRankScore = 1 - index / searchResults.length;
      opp.mlScore =
        blendWeight * opp.mlScore + (1 - blendWeight) * originalRankScore;
    });

    // Re-sort by blended score
    scored.sort((a, b) => b.mlScore - a.mlScore);

    return scored;
  }

  /**
   * Explain why an opportunity was recommended
   */
  explainScore(scoredOpportunity: ScoredOpportunity): string[] {
    const explanations: string[] = [];
    const breakdown = scoredOpportunity.scoreBreakdown;

    if (breakdown.relevance > 0.7) {
      explanations.push('Highly relevant to your skills and interests');
    } else if (breakdown.relevance > 0.5) {
      explanations.push('Matches some of your skills');
    }

    if (breakdown.quality > 0.7) {
      explanations.push('High-quality opportunity from reputable organizer');
    }

    if (breakdown.urgency > 0.7) {
      explanations.push('Deadline approaching soon');
    } else if (breakdown.urgency > 0.5) {
      explanations.push('Application deadline in the next few weeks');
    }

    if (breakdown.personalization > 0.7) {
      explanations.push('Personalized based on your profile and past activity');
    }

    if (explanations.length === 0) {
      explanations.push('Matches your search criteria');
    }

    return explanations;
  }
}

// Singleton instance
let mlScoringServiceInstance: MLScoringService | null = null;

/**
 * Get ML Scoring Service instance
 */
export function getMLScoringService(): MLScoringService {
  if (!mlScoringServiceInstance) {
    mlScoringServiceInstance = new MLScoringService();
  }
  return mlScoringServiceInstance;
}

/**
 * Reset ML Scoring Service instance (useful for testing)
 */
export function resetMLScoringService(): void {
  mlScoringServiceInstance = null;
}
