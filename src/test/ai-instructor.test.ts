import { aiInstructorService } from '../lib/services/ai-instructor.service';
import type { UserProfile } from '../types';

describe('AI Instructor Service', () => {
  const mockUserProfile: UserProfile = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    location: {
      city: 'Pune',
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
      technical: ['JavaScript', 'Python', 'React'],
      domains: ['Web Development', 'Data Science'],
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOpportunityId = 'opportunity-123';

  describe('generateRoadmap', () => {
    it('should generate a roadmap successfully', async () => {
      const request = {
        opportunityId: mockOpportunityId,
        userProfile: mockUserProfile,
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        customGoals: [
          'Learn advanced React patterns',
          'Build portfolio project',
        ],
      };

      const result = await aiInstructorService.generateRoadmap(request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.data) {
        expect(result.data.roadmap).toBeDefined();
        expect(result.data.roadmap.phases).toBeInstanceOf(Array);
        expect(result.data.roadmap.phases.length).toBeGreaterThan(0);
        expect(result.data.personalizedTips).toBeInstanceOf(Array);
        expect(result.data.skillGaps).toBeInstanceOf(Array);
        expect(result.data.recommendedActions).toBeInstanceOf(Array);
      }
    });

    it('should handle invalid opportunity ID', async () => {
      const request = {
        opportunityId: 'invalid-opportunity-id',
        userProfile: mockUserProfile,
      };

      const result = await aiInstructorService.generateRoadmap(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('trackProgress', () => {
    it('should track progress successfully', async () => {
      const roadmapId = 'roadmap-123';
      const taskId = 'task-123';
      const completed = true;

      const result = await aiInstructorService.trackProgress(
        roadmapId,
        taskId,
        completed
      );

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });
  });

  describe('getUserRoadmaps', () => {
    it('should retrieve user roadmaps successfully', async () => {
      const userId = 'user-123';

      const result = await aiInstructorService.getUserRoadmaps(userId);

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
    });
  });

  describe('updateRoadmap', () => {
    it('should update roadmap successfully', async () => {
      const roadmapId = 'roadmap-123';
      const feedback = {
        completedTasks: ['task-1', 'task-2'],
        strugglingWith: ['advanced-concepts'],
        additionalGoals: ['learn-testing'],
      };

      const result = await aiInstructorService.updateRoadmap(
        roadmapId,
        feedback
      );

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });
  });
});
