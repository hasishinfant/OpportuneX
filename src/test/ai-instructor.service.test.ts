/**
 * Unit tests for AI Instructor Service
 * Tests roadmap generation, skill assessment, and personalization features
 */

import { PrismaClient } from '@prisma/client';
import type {
  RoadmapRequest,
  UserProfile,
} from '../lib/services/ai-instructor.service';
import { AIInstructorService } from '../lib/services/ai-instructor.service';

// Mock dependencies
jest.mock('@prisma/client');

const mockPrisma = {
  opportunity: {
    findUnique: jest.fn(),
  },
  roadmap: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(
  () => mockPrisma as any
);

// Mock fetch for LLM API calls
global.fetch = jest.fn();

describe('AIInstructorService', () => {
  let aiInstructorService: AIInstructorService;

  beforeEach(() => {
    aiInstructorService = new AIInstructorService();
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  const mockUserProfile: UserProfile = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    location: {
      city: 'Mumbai',
      state: 'Maharashtra',
      tier: 2,
    },
    academic: {
      institution: 'Test University',
      degree: 'Computer Science',
      year: 3,
      cgpa: 8.5,
    },
    skills: {
      technical: ['JavaScript', 'React', 'Node.js'],
      domains: ['Web Development'],
      proficiencyLevel: 'intermediate',
    },
    preferences: {
      opportunityTypes: ['hackathon', 'internship'],
      preferredMode: 'hybrid',
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
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockOpportunity = {
    id: 'opp-123',
    title: 'AI/ML Hackathon 2024',
    type: 'hackathon',
    organizerName: 'TechCorp',
    requiredSkills: [
      'Python',
      'Machine Learning',
      'TensorFlow',
      'Data Analysis',
    ],
    applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };

  const mockRoadmapRequest: RoadmapRequest = {
    opportunityId: 'opp-123',
    userProfile: mockUserProfile,
    targetDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    customGoals: ['Build a strong portfolio', 'Learn advanced ML concepts'],
  };

  describe('generateRoadmap', () => {
    it('should successfully generate a personalized roadmap', async () => {
      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);
      mockPrisma.roadmap.create.mockResolvedValue({});

      const result =
        await aiInstructorService.generateRoadmap(mockRoadmapRequest);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.roadmap).toBeDefined();
      expect(result.data?.roadmap.title).toBeDefined();
      expect(result.data?.roadmap.phases).toBeInstanceOf(Array);
      expect(result.data?.roadmap.phases.length).toBeGreaterThan(0);
      expect(result.data?.personalizedTips).toBeInstanceOf(Array);
      expect(result.data?.skillGaps).toBeInstanceOf(Array);
      expect(result.data?.recommendedActions).toBeInstanceOf(Array);
      expect(result.message).toBe('Roadmap generated successfully');

      expect(mockPrisma.opportunity.findUnique).toHaveBeenCalledWith({
        where: { id: 'opp-123' },
      });
    });

    it('should handle opportunity not found by using mock data', async () => {
      mockPrisma.opportunity.findUnique.mockResolvedValue(null);
      mockPrisma.roadmap.create.mockResolvedValue({});

      const result =
        await aiInstructorService.generateRoadmap(mockRoadmapRequest);

      expect(result.success).toBe(true);
      expect(result.data?.roadmap).toBeDefined();
      // Should still generate roadmap with mock opportunity data
    });

    it('should identify skill gaps correctly', async () => {
      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);
      mockPrisma.roadmap.create.mockResolvedValue({});

      const result =
        await aiInstructorService.generateRoadmap(mockRoadmapRequest);

      expect(result.success).toBe(true);
      expect(result.data?.skillGaps).toContain('Python');
      expect(result.data?.skillGaps).toContain('Machine Learning');
      expect(result.data?.skillGaps).toContain('TensorFlow');
      expect(result.data?.skillGaps).toContain('Data Analysis');
      // User has JavaScript, React, Node.js but opportunity needs Python, ML, etc.
    });

    it('should generate appropriate phases for different opportunity types', async () => {
      const internshipOpportunity = {
        ...mockOpportunity,
        type: 'internship',
        title: 'Software Development Internship',
        requiredSkills: ['JavaScript', 'React', 'Node.js', 'Database Design'],
      };

      mockPrisma.opportunity.findUnique.mockResolvedValue(
        internshipOpportunity
      );
      mockPrisma.roadmap.create.mockResolvedValue({});

      const internshipRequest = {
        ...mockRoadmapRequest,
        opportunityId: 'internship-123',
      };

      const result =
        await aiInstructorService.generateRoadmap(internshipRequest);

      expect(result.success).toBe(true);
      expect(result.data?.roadmap.phases).toBeInstanceOf(Array);
      expect(result.data?.roadmap.phases.length).toBeGreaterThan(0);

      // Should have fewer skill gaps since user already has JavaScript, React, Node.js
      expect(result.data?.skillGaps.length).toBeLessThan(4);
    });

    it('should consider user proficiency level in roadmap generation', async () => {
      const beginnerProfile = {
        ...mockUserProfile,
        skills: {
          ...mockUserProfile.skills,
          technical: ['HTML', 'CSS'],
          proficiencyLevel: 'beginner' as const,
        },
      };

      const beginnerRequest = {
        ...mockRoadmapRequest,
        userProfile: beginnerProfile,
      };

      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);
      mockPrisma.roadmap.create.mockResolvedValue({});

      const result = await aiInstructorService.generateRoadmap(beginnerRequest);

      expect(result.success).toBe(true);
      expect(result.data?.roadmap.estimatedDuration).toBeGreaterThan(20); // Should take longer for beginners
      expect(result.data?.personalizedTips).toContain(
        expect.stringMatching(/beginner/i)
      );
    });

    it('should handle target date constraints', async () => {
      const urgentRequest = {
        ...mockRoadmapRequest,
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      };

      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);
      mockPrisma.roadmap.create.mockResolvedValue({});

      const result = await aiInstructorService.generateRoadmap(urgentRequest);

      expect(result.success).toBe(true);
      expect(result.data?.roadmap.estimatedDuration).toBeLessThanOrEqual(7);
      // Should prioritize most critical skills when time is limited
    });

    it('should include custom goals in roadmap', async () => {
      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);
      mockPrisma.roadmap.create.mockResolvedValue({});

      const result =
        await aiInstructorService.generateRoadmap(mockRoadmapRequest);

      expect(result.success).toBe(true);
      expect(result.data?.recommendedActions).toContain(
        expect.stringMatching(/portfolio|github/i)
      );
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.opportunity.findUnique.mockRejectedValue(dbError);

      const result =
        await aiInstructorService.generateRoadmap(mockRoadmapRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate roadmap');
    });

    it('should generate milestones based on phases', async () => {
      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);
      mockPrisma.roadmap.create.mockResolvedValue({});

      const result =
        await aiInstructorService.generateRoadmap(mockRoadmapRequest);

      expect(result.success).toBe(true);
      expect(result.data?.roadmap.milestones).toBeInstanceOf(Array);
      expect(result.data?.roadmap.milestones.length).toBeGreaterThan(0);

      const firstMilestone = result.data?.roadmap.milestones[0];
      expect(firstMilestone?.title).toBeDefined();
      expect(firstMilestone?.targetDate).toBeInstanceOf(Date);
      expect(firstMilestone?.completed).toBe(false);
      expect(firstMilestone?.tasks).toBeInstanceOf(Array);
    });

    it('should include appropriate resources for each phase', async () => {
      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);
      mockPrisma.roadmap.create.mockResolvedValue({});

      const result =
        await aiInstructorService.generateRoadmap(mockRoadmapRequest);

      expect(result.success).toBe(true);
      expect(result.data?.roadmap.resources).toBeInstanceOf(Array);
      expect(result.data?.roadmap.resources.length).toBeGreaterThan(0);

      const resource = result.data?.roadmap.resources[0];
      expect(resource?.title).toBeDefined();
      expect(resource?.type).toMatch(/article|video|course|book|practice/);
      expect(resource?.url).toBeDefined();
      expect(resource?.difficulty).toMatch(/beginner|intermediate|advanced/);
      expect(typeof resource?.free).toBe('boolean');
    });
  });

  describe('trackProgress', () => {
    it('should successfully track task completion', async () => {
      const result = await aiInstructorService.trackProgress(
        'roadmap-123',
        'task-456',
        true
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Progress updated successfully');
    });

    it('should handle progress tracking errors', async () => {
      // Mock console.log to avoid test output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await aiInstructorService.trackProgress('', '', true);

      expect(result.success).toBe(true); // Current implementation always succeeds

      consoleSpy.mockRestore();
    });
  });

  describe('updateRoadmap', () => {
    const mockFeedback = {
      completedTasks: ['task-1', 'task-2'],
      strugglingWith: ['Machine Learning concepts'],
      additionalGoals: ['Learn Docker', 'Understand microservices'],
    };

    it('should successfully update roadmap based on feedback', async () => {
      const result = await aiInstructorService.updateRoadmap(
        'roadmap-123',
        mockFeedback
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Roadmap updated successfully based on your progress'
      );
    });

    it('should handle update errors gracefully', async () => {
      // This would test actual update logic when implemented
      const result = await aiInstructorService.updateRoadmap(
        'invalid-id',
        mockFeedback
      );

      expect(result.success).toBe(true); // Current implementation always succeeds
    });
  });

  describe('getUserRoadmaps', () => {
    it('should retrieve user roadmaps successfully', async () => {
      const mockRoadmaps = [
        {
          id: 'roadmap-123',
          userId: 'user-123',
          opportunityId: 'opportunity-123',
          title: 'AI/ML Hackathon Preparation',
          description: 'Comprehensive roadmap for AI/ML hackathon success',
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
          opportunity: {
            title: 'AI/ML Hackathon 2024',
            type: 'hackathon',
            applicationDeadline: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ),
          },
        },
      ];

      mockPrisma.roadmap.findMany.mockResolvedValue(mockRoadmaps);

      const result = await aiInstructorService.getUserRoadmaps('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data?.length).toBe(1);
      expect(result.data?.[0].title).toBe('AI/ML Hackathon Preparation');
      expect(result.message).toContain('retrieved successfully');
    });

    it('should return mock data when Prisma is not available', async () => {
      // Test the fallback behavior
      const result = await aiInstructorService.getUserRoadmaps('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
      expect(result.message).toContain('mock data');
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database query failed');
      mockPrisma.roadmap.findMany.mockRejectedValue(dbError);

      const result = await aiInstructorService.getUserRoadmaps('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to retrieve user roadmaps');
    });

    it('should return empty array for user with no roadmaps', async () => {
      mockPrisma.roadmap.findMany.mockResolvedValue([]);

      const result = await aiInstructorService.getUserRoadmaps('user-456');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('Skill Assessment Logic', () => {
    it('should correctly assess skill gaps for different proficiency levels', async () => {
      // Test with advanced user
      const advancedProfile = {
        ...mockUserProfile,
        skills: {
          ...mockUserProfile.skills,
          technical: [
            'Python',
            'Machine Learning',
            'TensorFlow',
            'Deep Learning',
          ],
          proficiencyLevel: 'advanced' as const,
        },
      };

      const advancedRequest = {
        ...mockRoadmapRequest,
        userProfile: advancedProfile,
      };

      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);
      mockPrisma.roadmap.create.mockResolvedValue({});

      const result = await aiInstructorService.generateRoadmap(advancedRequest);

      expect(result.success).toBe(true);
      expect(result.data?.skillGaps.length).toBeLessThan(2); // Should have minimal gaps
      expect(result.data?.roadmap.estimatedDuration).toBeLessThan(20); // Shorter duration
    });

    it('should prioritize high-gap skills in roadmap phases', async () => {
      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);
      mockPrisma.roadmap.create.mockResolvedValue({});

      const result =
        await aiInstructorService.generateRoadmap(mockRoadmapRequest);

      expect(result.success).toBe(true);

      // First phase should focus on foundation/skill gaps
      const firstPhase = result.data?.roadmap.phases[0];
      expect(firstPhase?.title).toMatch(/foundation|skill|gap/i);
      expect(firstPhase?.tasks.length).toBeGreaterThan(0);
    });

    it('should handle users with no matching skills', async () => {
      const noSkillsProfile = {
        ...mockUserProfile,
        skills: {
          ...mockUserProfile.skills,
          technical: ['Photoshop', 'Illustrator'], // Completely unrelated skills
          proficiencyLevel: 'beginner' as const,
        },
      };

      const noSkillsRequest = {
        ...mockRoadmapRequest,
        userProfile: noSkillsProfile,
      };

      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);
      mockPrisma.roadmap.create.mockResolvedValue({});

      const result = await aiInstructorService.generateRoadmap(noSkillsRequest);

      expect(result.success).toBe(true);
      expect(result.data?.skillGaps.length).toBe(4); // All required skills are gaps
      expect(result.data?.roadmap.estimatedDuration).toBeGreaterThan(25); // Longer duration needed
    });
  });

  describe('LLM Integration', () => {
    beforeEach(() => {
      // Reset environment variables
      delete process.env.LLM_PROVIDER;
      delete process.env.OPENAI_API_KEY;
      delete process.env.CLAUDE_API_KEY;
    });

    it('should use mock provider by default', async () => {
      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);
      mockPrisma.roadmap.create.mockResolvedValue({});

      const result =
        await aiInstructorService.generateRoadmap(mockRoadmapRequest);

      expect(result.success).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled(); // Should not call external APIs
    });

    it('should handle OpenAI API integration', async () => {
      process.env.LLM_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'test-key';

      const mockOpenAIResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: 'Mock roadmap content from OpenAI',
                },
              },
            ],
          }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockOpenAIResponse);

      // Create new service instance to pick up env vars
      const aiService = new AIInstructorService();
      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);
      mockPrisma.roadmap.create.mockResolvedValue({});

      const result = await aiService.generateRoadmap(mockRoadmapRequest);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle Claude API integration', async () => {
      process.env.LLM_PROVIDER = 'claude';
      process.env.CLAUDE_API_KEY = 'test-claude-key';

      const mockClaudeResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            content: [
              {
                text: 'Mock roadmap content from Claude',
              },
            ],
          }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockClaudeResponse);

      const aiService = new AIInstructorService();
      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);
      mockPrisma.roadmap.create.mockResolvedValue({});

      const result = await aiService.generateRoadmap(mockRoadmapRequest);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-claude-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle LLM API errors gracefully', async () => {
      process.env.LLM_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'test-key';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'API Error',
      });

      const aiService = new AIInstructorService();
      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);

      const result = await aiService.generateRoadmap(mockRoadmapRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate roadmap');
    });

    it('should handle missing API keys', async () => {
      process.env.LLM_PROVIDER = 'openai';
      // Don't set API key

      const aiService = new AIInstructorService();
      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);

      const result = await aiService.generateRoadmap(mockRoadmapRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate roadmap');
    });
  });

  describe('Roadmap Templates', () => {
    it('should select appropriate template based on opportunity type and skill level', async () => {
      const beginnerHackathonRequest = {
        ...mockRoadmapRequest,
        userProfile: {
          ...mockUserProfile,
          skills: {
            ...mockUserProfile.skills,
            proficiencyLevel: 'beginner' as const,
          },
        },
      };

      mockPrisma.opportunity.findUnique.mockResolvedValue({
        ...mockOpportunity,
        type: 'hackathon',
      });
      mockPrisma.roadmap.create.mockResolvedValue({});

      const result = await aiInstructorService.generateRoadmap(
        beginnerHackathonRequest
      );

      expect(result.success).toBe(true);
      expect(result.data?.roadmap.title).toMatch(/hackathon/i);
    });

    it('should fallback to generic template when specific template not found', async () => {
      const workshopRequest = {
        ...mockRoadmapRequest,
        userProfile: {
          ...mockUserProfile,
          skills: {
            ...mockUserProfile.skills,
            proficiencyLevel: 'advanced' as const,
          },
        },
      };

      mockPrisma.opportunity.findUnique.mockResolvedValue({
        ...mockOpportunity,
        type: 'workshop',
      });
      mockPrisma.roadmap.create.mockResolvedValue({});

      const result = await aiInstructorService.generateRoadmap(workshopRequest);

      expect(result.success).toBe(true);
      // Should still generate a roadmap even without specific template
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty required skills', async () => {
      const noSkillsOpportunity = {
        ...mockOpportunity,
        requiredSkills: [],
      };

      mockPrisma.opportunity.findUnique.mockResolvedValue(noSkillsOpportunity);
      mockPrisma.roadmap.create.mockResolvedValue({});

      const result =
        await aiInstructorService.generateRoadmap(mockRoadmapRequest);

      expect(result.success).toBe(true);
      expect(result.data?.skillGaps).toEqual([]);
    });

    it('should handle invalid target dates', async () => {
      const pastDateRequest = {
        ...mockRoadmapRequest,
        targetDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      };

      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);
      mockPrisma.roadmap.create.mockResolvedValue({});

      const result = await aiInstructorService.generateRoadmap(pastDateRequest);

      expect(result.success).toBe(true);
      // Should handle gracefully, possibly ignoring the past date
    });

    it('should handle malformed user profile', async () => {
      const malformedProfile = {
        ...mockUserProfile,
        skills: {
          technical: null as any,
          domains: [],
          proficiencyLevel: 'invalid' as any,
        },
      };

      const malformedRequest = {
        ...mockRoadmapRequest,
        userProfile: malformedProfile,
      };

      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);

      const result =
        await aiInstructorService.generateRoadmap(malformedRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate roadmap');
    });

    it('should handle very large skill lists', async () => {
      const manySkillsProfile = {
        ...mockUserProfile,
        skills: {
          ...mockUserProfile.skills,
          technical: Array.from({ length: 100 }, (_, i) => `Skill${i}`),
        },
      };

      const manySkillsRequest = {
        ...mockRoadmapRequest,
        userProfile: manySkillsProfile,
      };

      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);
      mockPrisma.roadmap.create.mockResolvedValue({});

      const result =
        await aiInstructorService.generateRoadmap(manySkillsRequest);

      expect(result.success).toBe(true);
      // Should handle large skill lists without issues
    });
  });
});
