/**
 * Unit tests for User Management Service
 * Tests all CRUD operations, search history, and favorites functionality
 */

import { PrismaClient } from '@prisma/client';
import type { UpdateUserProfileRequest } from '../lib/services/user.service';
import { UserService } from '../lib/services/user.service';

// Mock Prisma Client
jest.mock('@prisma/client');
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  userSearch: {
    findMany: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  userFavorite: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
};

// Mock the PrismaClient constructor
(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma as any);

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    const mockUserId = 'user-123';
    const mockUserData = {
      id: mockUserId,
      email: 'test@example.com',
      name: 'Test User',
      phone: '+91-9876543210',
      city: 'Pune',
      state: 'Maharashtra',
      tier: 2,
      institution: 'Test University',
      degree: 'Computer Science',
      year: 3,
      cgpa: 8.5,
      technicalSkills: ['JavaScript', 'React', 'Node.js'],
      domains: ['Web Development', 'AI/ML'],
      proficiencyLevel: 'intermediate',
      preferredOpportunityTypes: ['hackathon', 'internship'],
      preferredMode: 'hybrid',
      maxDistance: 50,
      emailNotifications: true,
      smsNotifications: false,
      inAppNotifications: true,
      notificationFrequency: 'daily',
      notificationTypes: ['new_opportunities', 'deadlines'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
      searches: [
        {
          id: 'search-1',
          query: 'AI hackathons',
          filters: { type: 'hackathon' },
          createdAt: new Date('2024-01-10'),
          resultCount: 15,
        },
      ],
      favorites: [
        {
          opportunityId: 'opp-1',
          opportunity: {
            id: 'opp-1',
            title: 'AI Hackathon 2024',
            type: 'hackathon',
            organizerName: 'TechCorp',
            applicationDeadline: new Date('2024-02-01'),
          },
        },
      ],
    };

    it('should successfully retrieve user profile', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserData);

      const result = await userService.getUserProfile(mockUserId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(mockUserId);
      expect(result.data?.email).toBe('test@example.com');
      expect(result.data?.name).toBe('Test User');
      expect(result.data?.location.city).toBe('Pune');
      expect(result.data?.location.tier).toBe(2);
      expect(result.data?.skills.technical).toEqual(['JavaScript', 'React', 'Node.js']);
      expect(result.data?.preferences.opportunityTypes).toEqual(['hackathon', 'internship']);
      expect(result.data?.searchHistory).toHaveLength(1);
      expect(result.data?.favoriteOpportunities).toEqual(['opp-1']);
      expect(result.message).toBe('User profile retrieved successfully');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        include: {
          searches: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          favorites: {
            include: {
              opportunity: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                  organizerName: true,
                  applicationDeadline: true,
                },
              },
            },
          },
        },
      });
    });

    it('should return error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await userService.getUserProfile('non-existent-user');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
      expect(result.data).toBeUndefined();
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.user.findUnique.mockRejectedValue(dbError);

      const result = await userService.getUserProfile(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to retrieve user profile');
      expect(result.data).toBeUndefined();
    });

    it('should handle user with minimal data', async () => {
      const minimalUserData = {
        id: mockUserId,
        email: 'minimal@example.com',
        name: 'Minimal User',
        phone: null,
        city: null,
        state: null,
        tier: null,
        institution: null,
        degree: null,
        year: null,
        cgpa: null,
        technicalSkills: null,
        domains: null,
        proficiencyLevel: 'beginner',
        preferredOpportunityTypes: ['internship'],
        preferredMode: null,
        maxDistance: null,
        emailNotifications: true,
        smsNotifications: true,
        inAppNotifications: true,
        notificationFrequency: 'immediate',
        notificationTypes: ['new_opportunities'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        searches: [],
        favorites: [],
      };

      mockPrisma.user.findUnique.mockResolvedValue(minimalUserData);

      const result = await userService.getUserProfile(mockUserId);

      expect(result.success).toBe(true);
      expect(result.data?.phone).toBeUndefined();
      expect(result.data?.location.city).toBe('');
      expect(result.data?.location.tier).toBe(2); // default value
      expect(result.data?.academic.institution).toBe('');
      expect(result.data?.academic.year).toBe(1); // default value
      expect(result.data?.skills.technical).toEqual([]);
      expect(result.data?.preferences.preferredMode).toBe('online'); // default value
    });
  });

  describe('updateUserProfile', () => {
    const mockUserId = 'user-123';
    const updateData: UpdateUserProfileRequest = {
      name: 'Updated User',
      phone: '+91-9876543211',
      city: 'Mumbai',
      state: 'Maharashtra',
      tier: 3,
      institution: 'Updated University',
      degree: 'Data Science',
      year: 4,
      cgpa: 9.0,
      technicalSkills: ['Python', 'Machine Learning'],
      domains: ['AI/ML', 'Data Science'],
      proficiencyLevel: 'advanced',
      preferredOpportunityTypes: ['internship', 'workshop'],
      preferredMode: 'online',
      maxDistance: 100,
      emailNotifications: false,
      smsNotifications: true,
      inAppNotifications: true,
      notificationFrequency: 'weekly',
      notificationTypes: ['deadlines', 'recommendations'],
    };

    const mockUpdatedUser = {
      id: mockUserId,
      email: 'test@example.com',
      ...updateData,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-20'),
      searches: [],
      favorites: [],
    };

    it('should successfully update user profile', async () => {
      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await userService.updateUserProfile(mockUserId, updateData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('Updated User');
      expect(result.data?.location.city).toBe('Mumbai');
      expect(result.data?.location.tier).toBe(3);
      expect(result.data?.skills.technical).toEqual(['Python', 'Machine Learning']);
      expect(result.data?.preferences.preferredMode).toBe('online');
      expect(result.message).toBe('User profile updated successfully');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          ...updateData,
          updatedAt: expect.any(Date),
        },
        include: {
          searches: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          favorites: true,
        },
      });
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { name: 'Partially Updated User' };
      const partiallyUpdatedUser = {
        ...mockUpdatedUser,
        name: 'Partially Updated User',
      };

      mockPrisma.user.update.mockResolvedValue(partiallyUpdatedUser);

      const result = await userService.updateUserProfile(mockUserId, partialUpdate);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Partially Updated User');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          name: 'Partially Updated User',
          phone: undefined,
          city: undefined,
          state: undefined,
          tier: undefined,
          institution: undefined,
          degree: undefined,
          year: undefined,
          cgpa: undefined,
          technicalSkills: undefined,
          domains: undefined,
          proficiencyLevel: undefined,
          preferredOpportunityTypes: undefined,
          preferredMode: undefined,
          maxDistance: undefined,
          emailNotifications: undefined,
          smsNotifications: undefined,
          inAppNotifications: undefined,
          notificationFrequency: undefined,
          notificationTypes: undefined,
          updatedAt: expect.any(Date),
        },
        include: {
          searches: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          favorites: true,
        },
      });
    });

    it('should handle database errors during update', async () => {
      const dbError = new Error('Update failed');
      mockPrisma.user.update.mockRejectedValue(dbError);

      const result = await userService.updateUserProfile(mockUserId, updateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update user profile');
      expect(result.data).toBeUndefined();
    });
  });

  describe('deleteUserProfile', () => {
    const mockUserId = 'user-123';

    it('should successfully delete user profile', async () => {
      mockPrisma.user.delete.mockResolvedValue({ id: mockUserId });

      const result = await userService.deleteUserProfile(mockUserId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User profile deleted successfully');

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: mockUserId },
      });
    });

    it('should handle database errors during deletion', async () => {
      const dbError = new Error('Delete failed');
      mockPrisma.user.delete.mockRejectedValue(dbError);

      const result = await userService.deleteUserProfile(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete user profile');
    });
  });

  describe('getUserSearchHistory', () => {
    const mockUserId = 'user-123';
    const mockSearches = [
      {
        id: 'search-1',
        query: 'AI hackathons',
        filters: { type: 'hackathon' },
        createdAt: new Date('2024-01-10'),
        resultCount: 15,
      },
      {
        id: 'search-2',
        query: 'web development internships',
        filters: { type: 'internship', skills: ['JavaScript'] },
        createdAt: new Date('2024-01-09'),
        resultCount: 8,
      },
    ];

    it('should successfully retrieve search history', async () => {
      mockPrisma.userSearch.findMany.mockResolvedValue(mockSearches);

      const result = await userService.getUserSearchHistory(mockUserId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].query).toBe('AI hackathons');
      expect(result.data?.[1].query).toBe('web development internships');
      expect(result.message).toBe('Search history retrieved successfully');

      expect(mockPrisma.userSearch.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should respect custom limit parameter', async () => {
      mockPrisma.userSearch.findMany.mockResolvedValue([mockSearches[0]]);

      const result = await userService.getUserSearchHistory(mockUserId, 1);

      expect(result.success).toBe(true);
      expect(mockPrisma.userSearch.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
    });

    it('should handle empty search history', async () => {
      mockPrisma.userSearch.findMany.mockResolvedValue([]);

      const result = await userService.getUserSearchHistory(mockUserId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockPrisma.userSearch.findMany.mockRejectedValue(dbError);

      const result = await userService.getUserSearchHistory(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to retrieve search history');
    });
  });

  describe('addSearchToHistory', () => {
    const mockUserId = 'user-123';
    const mockQuery = 'machine learning workshops';
    const mockFilters = { type: 'workshop', skills: ['Python'] };
    const mockResultCount = 12;

    it('should successfully add search to history', async () => {
      mockPrisma.userSearch.create.mockResolvedValue({
        id: 'search-new',
        userId: mockUserId,
        query: mockQuery,
        filters: mockFilters,
        resultCount: mockResultCount,
        createdAt: new Date(),
      });

      const result = await userService.addSearchToHistory(
        mockUserId,
        mockQuery,
        mockFilters,
        mockResultCount
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Search added to history successfully');

      expect(mockPrisma.userSearch.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          query: mockQuery,
          filters: mockFilters,
          resultCount: mockResultCount,
        },
      });
    });

    it('should handle database errors during creation', async () => {
      const dbError = new Error('Create failed');
      mockPrisma.userSearch.create.mockRejectedValue(dbError);

      const result = await userService.addSearchToHistory(
        mockUserId,
        mockQuery,
        mockFilters,
        mockResultCount
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add search to history');
    });
  });

  describe('clearSearchHistory', () => {
    const mockUserId = 'user-123';

    it('should successfully clear search history', async () => {
      mockPrisma.userSearch.deleteMany.mockResolvedValue({ count: 5 });

      const result = await userService.clearSearchHistory(mockUserId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Search history cleared successfully');

      expect(mockPrisma.userSearch.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });

    it('should handle database errors during deletion', async () => {
      const dbError = new Error('Delete failed');
      mockPrisma.userSearch.deleteMany.mockRejectedValue(dbError);

      const result = await userService.clearSearchHistory(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to clear search history');
    });
  });

  describe('getUserFavorites', () => {
    const mockUserId = 'user-123';
    const mockFavorites = [
      { opportunityId: 'opp-1' },
      { opportunityId: 'opp-2' },
      { opportunityId: 'opp-3' },
    ];

    it('should successfully retrieve user favorites', async () => {
      mockPrisma.userFavorite.findMany.mockResolvedValue(mockFavorites);

      const result = await userService.getUserFavorites(mockUserId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(['opp-1', 'opp-2', 'opp-3']);
      expect(result.message).toBe('Favorite opportunities retrieved successfully');

      expect(mockPrisma.userFavorite.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        select: { opportunityId: true },
      });
    });

    it('should handle empty favorites list', async () => {
      mockPrisma.userFavorite.findMany.mockResolvedValue([]);

      const result = await userService.getUserFavorites(mockUserId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockPrisma.userFavorite.findMany.mockRejectedValue(dbError);

      const result = await userService.getUserFavorites(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to retrieve favorite opportunities');
    });
  });

  describe('addToFavorites', () => {
    const mockUserId = 'user-123';
    const mockOpportunityId = 'opp-456';

    it('should successfully add opportunity to favorites', async () => {
      mockPrisma.userFavorite.findUnique.mockResolvedValue(null);
      mockPrisma.userFavorite.create.mockResolvedValue({
        userId: mockUserId,
        opportunityId: mockOpportunityId,
        createdAt: new Date(),
      });

      const result = await userService.addToFavorites(mockUserId, mockOpportunityId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Opportunity added to favorites successfully');

      expect(mockPrisma.userFavorite.findUnique).toHaveBeenCalledWith({
        where: {
          userId_opportunityId: {
            userId: mockUserId,
            opportunityId: mockOpportunityId,
          },
        },
      });

      expect(mockPrisma.userFavorite.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          opportunityId: mockOpportunityId,
        },
      });
    });

    it('should prevent duplicate favorites', async () => {
      mockPrisma.userFavorite.findUnique.mockResolvedValue({
        userId: mockUserId,
        opportunityId: mockOpportunityId,
        createdAt: new Date(),
      });

      const result = await userService.addToFavorites(mockUserId, mockOpportunityId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Opportunity is already in favorites');

      expect(mockPrisma.userFavorite.create).not.toHaveBeenCalled();
    });

    it('should handle database errors during creation', async () => {
      mockPrisma.userFavorite.findUnique.mockResolvedValue(null);
      const dbError = new Error('Create failed');
      mockPrisma.userFavorite.create.mockRejectedValue(dbError);

      const result = await userService.addToFavorites(mockUserId, mockOpportunityId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add opportunity to favorites');
    });
  });

  describe('removeFromFavorites', () => {
    const mockUserId = 'user-123';
    const mockOpportunityId = 'opp-456';

    it('should successfully remove opportunity from favorites', async () => {
      mockPrisma.userFavorite.deleteMany.mockResolvedValue({ count: 1 });

      const result = await userService.removeFromFavorites(mockUserId, mockOpportunityId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Opportunity removed from favorites successfully');

      expect(mockPrisma.userFavorite.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          opportunityId: mockOpportunityId,
        },
      });
    });

    it('should handle case when opportunity is not in favorites', async () => {
      mockPrisma.userFavorite.deleteMany.mockResolvedValue({ count: 0 });

      const result = await userService.removeFromFavorites(mockUserId, mockOpportunityId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Opportunity not found in favorites');
    });

    it('should handle database errors during deletion', async () => {
      const dbError = new Error('Delete failed');
      mockPrisma.userFavorite.deleteMany.mockRejectedValue(dbError);

      const result = await userService.removeFromFavorites(mockUserId, mockOpportunityId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to remove opportunity from favorites');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined user IDs gracefully', async () => {
      const result = await userService.getUserProfile('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to retrieve user profile');
    });

    it('should handle malformed data in database responses', async () => {
      const malformedUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        // Missing required fields
        searches: null,
        favorites: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(malformedUser);

      const result = await userService.getUserProfile('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to retrieve user profile');
    });

    it('should handle very large search history requests', async () => {
      const result = await userService.getUserSearchHistory('user-123', 10000);

      expect(mockPrisma.userSearch.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 10000,
      });
    });
  });
});