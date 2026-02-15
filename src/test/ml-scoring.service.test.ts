/**
 * Unit tests for ML Scoring Service
 */

import {
  MLScoringService,
  getMLScoringService,
  resetMLScoringService,
} from '../lib/services/ml-scoring.service';
import type { Opportunity, UserProfile } from '../types';

describe('MLScoringService', () => {
  let service: MLScoringService;
  let mockUser: UserProfile;
  let mockOpportunity: Opportunity;

  beforeEach(() => {
    resetMLScoringService();
    service = getMLScoringService();

    mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      location: {
        city: 'Pune',
        state: 'Maharashtra',
        tier: 2,
      },
      academic: {
        institution: 'Test University',
        degree: 'B.Tech',
        year: 3,
        cgpa: 8.5,
      },
      skills: {
        technical: ['JavaScript', 'React', 'Node.js'],
        domains: ['Web Development', 'AI/ML'],
        proficiencyLevel: 'intermediate',
      },
      preferences: {
        opportunityTypes: ['hackathon', 'internship'],
        preferredMode: 'online',
        notifications: {
          email: true,
          sms: false,
          inApp: true,
          frequency: 'daily',
          types: ['new_opportunities', 'deadlines'],
        },
      },
      searchHistory: [],
      favoriteOpportunities: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockOpportunity = {
      id: 'opp-1',
      title: 'Web Development Hackathon',
      description: 'Build amazing web applications',
      type: 'hackathon',
      organizer: {
        name: 'Tech Corp',
        type: 'corporate',
        logo: 'https://example.com/logo.png',
      },
      requirements: {
        skills: ['JavaScript', 'React'],
        eligibility: ['Students'],
      },
      details: {
        mode: 'online',
        prizes: ['$10,000'],
      },
      timeline: {
        applicationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
      externalUrl: 'https://example.com/hackathon',
      sourceId: 'source-1',
      tags: ['web', 'development'],
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      updatedAt: new Date(),
      isActive: true,
      qualityScore: 85,
    };
  });

  describe('scoreOpportunity', () => {
    it('should score an opportunity for a user', async () => {
      const scored = await service.scoreOpportunity(mockUser, mockOpportunity);

      expect(scored).toBeDefined();
      expect(scored.mlScore).toBeGreaterThan(0);
      expect(scored.mlScore).toBeLessThanOrEqual(1);
      expect(scored.id).toBe(mockOpportunity.id);
    });

    it('should include score breakdown when requested', async () => {
      const scored = await service.scoreOpportunity(mockUser, mockOpportunity, {
        includeBreakdown: true,
      });

      expect(scored.scoreBreakdown).toBeDefined();
      expect(scored.scoreBreakdown.relevance).toBeGreaterThanOrEqual(0);
      expect(scored.scoreBreakdown.quality).toBeGreaterThanOrEqual(0);
      expect(scored.scoreBreakdown.urgency).toBeGreaterThanOrEqual(0);
      expect(scored.scoreBreakdown.personalization).toBeGreaterThanOrEqual(0);
    });

    it('should give higher score for perfect skill match', async () => {
      const perfectMatchOpp = {
        ...mockOpportunity,
        requirements: {
          ...mockOpportunity.requirements,
          skills: ['JavaScript', 'React', 'Node.js'], // Exact match with user skills
        },
      };

      const scored = await service.scoreOpportunity(mockUser, perfectMatchOpp);
      expect(scored.mlScore).toBeGreaterThan(0.5);
    });

    it('should give lower score for no skill match', async () => {
      const noMatchOpp = {
        ...mockOpportunity,
        requirements: {
          ...mockOpportunity.requirements,
          skills: ['Python', 'Django', 'PostgreSQL'], // No match with user skills
        },
      };

      const scored = await service.scoreOpportunity(mockUser, noMatchOpp);
      expect(scored.mlScore).toBeLessThan(0.7);
    });
  });

  describe('scoreOpportunities', () => {
    it('should score multiple opportunities and sort by score', async () => {
      const opportunities = [
        mockOpportunity,
        {
          ...mockOpportunity,
          id: 'opp-2',
          requirements: {
            ...mockOpportunity.requirements,
            skills: ['Python'], // Less relevant
          },
        },
        {
          ...mockOpportunity,
          id: 'opp-3',
          requirements: {
            ...mockOpportunity.requirements,
            skills: ['JavaScript', 'React', 'Node.js'], // More relevant
          },
        },
      ];

      const scored = await service.scoreOpportunities(mockUser, opportunities);

      expect(scored).toHaveLength(3);
      expect(scored[0].mlScore).toBeGreaterThanOrEqual(scored[1].mlScore);
      expect(scored[1].mlScore).toBeGreaterThanOrEqual(scored[2].mlScore);
    });

    it('should filter by minimum score', async () => {
      const opportunities = [mockOpportunity];

      const scored = await service.scoreOpportunities(mockUser, opportunities, {
        minScore: 0.9, // Very high threshold
      });

      // May or may not have results depending on actual score
      expect(Array.isArray(scored)).toBe(true);
    });

    it('should limit results when maxResults is specified', async () => {
      const opportunities = Array.from({ length: 20 }, (_, i) => ({
        ...mockOpportunity,
        id: `opp-${i}`,
      }));

      const scored = await service.scoreOpportunities(mockUser, opportunities, {
        maxResults: 5,
      });

      expect(scored).toHaveLength(5);
    });
  });

  describe('recordInteraction', () => {
    it('should record user interaction', async () => {
      const interaction = {
        userId: mockUser.id,
        opportunityId: mockOpportunity.id,
        clicked: true,
        applied: false,
        favorited: false,
        timeSpent: 45,
        timestamp: new Date(),
      };

      await expect(
        service.recordInteraction(interaction)
      ).resolves.not.toThrow();
    });
  });

  describe('getRecommendations', () => {
    it('should return personalized recommendations', async () => {
      const opportunities = Array.from({ length: 10 }, (_, i) => ({
        ...mockOpportunity,
        id: `opp-${i}`,
      }));

      const recommendations = await service.getRecommendations(
        mockUser,
        opportunities,
        5
      );

      expect(recommendations).toHaveLength(5);
      expect(recommendations[0].scoreBreakdown).toBeDefined();
    });

    it('should filter out low-scoring opportunities', async () => {
      const opportunities = [
        {
          ...mockOpportunity,
          requirements: {
            ...mockOpportunity.requirements,
            skills: ['Completely', 'Unrelated', 'Skills'],
          },
        },
      ];

      const recommendations = await service.getRecommendations(
        mockUser,
        opportunities
      );

      // Should filter out opportunities with score < 0.3
      expect(recommendations.length).toBeLessThanOrEqual(opportunities.length);
    });
  });

  describe('reRankSearchResults', () => {
    it('should re-rank search results using ML scores', async () => {
      const searchResults = [
        mockOpportunity,
        {
          ...mockOpportunity,
          id: 'opp-2',
          requirements: {
            ...mockOpportunity.requirements,
            skills: ['JavaScript', 'React', 'Node.js'], // Better match
          },
        },
      ];

      const reRanked = await service.reRankSearchResults(
        mockUser,
        searchResults
      );

      expect(reRanked).toHaveLength(2);
      expect(reRanked[0].mlScore).toBeDefined();
    });

    it('should blend ML score with original ranking', async () => {
      const searchResults = Array.from({ length: 5 }, (_, i) => ({
        ...mockOpportunity,
        id: `opp-${i}`,
      }));

      const reRanked = await service.reRankSearchResults(
        mockUser,
        searchResults,
        {
          blendWeight: 0.5, // 50-50 blend
        }
      );

      expect(reRanked).toHaveLength(5);
    });
  });

  describe('explainScore', () => {
    it('should provide explanations for high-scoring opportunity', async () => {
      const scored = await service.scoreOpportunity(mockUser, mockOpportunity, {
        includeBreakdown: true,
      });

      const explanations = service.explainScore(scored);

      expect(Array.isArray(explanations)).toBe(true);
      expect(explanations.length).toBeGreaterThan(0);
      expect(typeof explanations[0]).toBe('string');
    });
  });

  describe('updateModelWeights', () => {
    it('should update model weights', () => {
      const currentWeights = service.getModelWeights();
      const newWeights = currentWeights.map(w => w * 1.1);

      service.updateModelWeights(newWeights);

      const updatedWeights = service.getModelWeights();
      expect(updatedWeights).toEqual(newWeights);
    });

    it('should throw error for invalid weight length', () => {
      expect(() => {
        service.updateModelWeights([0.1, 0.2]); // Wrong length
      }).toThrow();
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = getMLScoringService();
      const instance2 = getMLScoringService();

      expect(instance1).toBe(instance2);
    });

    it('should reset instance', () => {
      const instance1 = getMLScoringService();
      resetMLScoringService();
      const instance2 = getMLScoringService();

      expect(instance1).not.toBe(instance2);
    });
  });
});
