import { PrismaClient } from '@prisma/client';
import type { ApiResponse, UserProfile } from '../../types';

const prisma = new PrismaClient();

export interface UpdateUserProfileRequest {
  name?: string;
  phone?: string;
  city?: string;
  state?: string;
  tier?: 2 | 3;
  institution?: string;
  degree?: string;
  year?: number;
  cgpa?: number;
  technicalSkills?: string[];
  domains?: string[];
  proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced';
  preferredOpportunityTypes?: Array<'hackathon' | 'internship' | 'workshop'>;
  preferredMode?: 'online' | 'offline' | 'hybrid';
  maxDistance?: number;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  inAppNotifications?: boolean;
  notificationFrequency?: 'immediate' | 'daily' | 'weekly';
  notificationTypes?: Array<
    'new_opportunities' | 'deadlines' | 'recommendations'
  >;
}

export class UserService {
  /**
   * Get user profile by ID
   */
  async getUserProfile(
    userId: string
  ): Promise<ApiResponse<UserProfile | null>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
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

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Transform database user to UserProfile format
      const userProfile: UserProfile = {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone || undefined,
        location: {
          city: user.city || '',
          state: user.state || '',
          tier: (user.tier as 2 | 3) || 2,
        },
        academic: {
          institution: user.institution || '',
          degree: user.degree || '',
          year: user.year || 1,
          cgpa: user.cgpa ? parseFloat(user.cgpa.toString()) : undefined,
        },
        skills: {
          technical: user.technicalSkills || [],
          domains: user.domains || [],
          proficiencyLevel: user.proficiencyLevel,
        },
        preferences: {
          opportunityTypes: user.preferredOpportunityTypes,
          preferredMode: user.preferredMode || 'online',
          maxDistance: user.maxDistance || undefined,
          notifications: {
            email: user.emailNotifications,
            sms: user.smsNotifications,
            inApp: user.inAppNotifications,
            frequency: user.notificationFrequency,
            types: user.notificationTypes,
          },
        },
        searchHistory: user.searches.map(search => ({
          id: search.id,
          query: search.query,
          filters: search.filters as any,
          timestamp: search.createdAt,
          resultCount: search.resultCount,
        })),
        favoriteOpportunities: user.favorites.map(fav => fav.opportunityId),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      return {
        success: true,
        data: userProfile,
        message: 'User profile retrieved successfully',
      };
    } catch (error) {
      console.error('Get user profile error:', error);
      return {
        success: false,
        error: 'Failed to retrieve user profile',
      };
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    updateData: UpdateUserProfileRequest
  ): Promise<ApiResponse<UserProfile>> {
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name: updateData.name,
          phone: updateData.phone,
          city: updateData.city,
          state: updateData.state,
          tier: updateData.tier,
          institution: updateData.institution,
          degree: updateData.degree,
          year: updateData.year,
          cgpa: updateData.cgpa,
          technicalSkills: updateData.technicalSkills,
          domains: updateData.domains,
          proficiencyLevel: updateData.proficiencyLevel,
          preferredOpportunityTypes: updateData.preferredOpportunityTypes,
          preferredMode: updateData.preferredMode,
          maxDistance: updateData.maxDistance,
          emailNotifications: updateData.emailNotifications,
          smsNotifications: updateData.smsNotifications,
          inAppNotifications: updateData.inAppNotifications,
          notificationFrequency: updateData.notificationFrequency,
          notificationTypes: updateData.notificationTypes,
          updatedAt: new Date(),
        },
        include: {
          searches: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          favorites: true,
        },
      });

      // Transform to UserProfile format
      const userProfile: UserProfile = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone || undefined,
        location: {
          city: updatedUser.city || '',
          state: updatedUser.state || '',
          tier: (updatedUser.tier as 2 | 3) || 2,
        },
        academic: {
          institution: updatedUser.institution || '',
          degree: updatedUser.degree || '',
          year: updatedUser.year || 1,
          cgpa: updatedUser.cgpa
            ? parseFloat(updatedUser.cgpa.toString())
            : undefined,
        },
        skills: {
          technical: updatedUser.technicalSkills || [],
          domains: updatedUser.domains || [],
          proficiencyLevel: updatedUser.proficiencyLevel,
        },
        preferences: {
          opportunityTypes: updatedUser.preferredOpportunityTypes,
          preferredMode: updatedUser.preferredMode || 'online',
          maxDistance: updatedUser.maxDistance || undefined,
          notifications: {
            email: updatedUser.emailNotifications,
            sms: updatedUser.smsNotifications,
            inApp: updatedUser.inAppNotifications,
            frequency: updatedUser.notificationFrequency,
            types: updatedUser.notificationTypes,
          },
        },
        searchHistory: updatedUser.searches.map(search => ({
          id: search.id,
          query: search.query,
          filters: search.filters as any,
          timestamp: search.createdAt,
          resultCount: search.resultCount,
        })),
        favoriteOpportunities: updatedUser.favorites.map(
          fav => fav.opportunityId
        ),
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      };

      return {
        success: true,
        data: userProfile,
        message: 'User profile updated successfully',
      };
    } catch (error) {
      console.error('Update user profile error:', error);
      return {
        success: false,
        error: 'Failed to update user profile',
      };
    }
  }

  /**
   * Delete user profile
   */
  async deleteUserProfile(userId: string): Promise<ApiResponse<null>> {
    try {
      await prisma.user.delete({
        where: { id: userId },
      });

      return {
        success: true,
        message: 'User profile deleted successfully',
      };
    } catch (error) {
      console.error('Delete user profile error:', error);
      return {
        success: false,
        error: 'Failed to delete user profile',
      };
    }
  }

  /**
   * Get user search history
   */
  async getUserSearchHistory(
    userId: string,
    limit = 50
  ): Promise<ApiResponse<any[]>> {
    try {
      const searches = await prisma.userSearch.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      const searchHistory = searches.map(search => ({
        id: search.id,
        query: search.query,
        filters: search.filters,
        timestamp: search.createdAt,
        resultCount: search.resultCount,
      }));

      return {
        success: true,
        data: searchHistory,
        message: 'Search history retrieved successfully',
      };
    } catch (error) {
      console.error('Get search history error:', error);
      return {
        success: false,
        error: 'Failed to retrieve search history',
      };
    }
  }

  /**
   * Add search to history
   */
  async addSearchToHistory(
    userId: string,
    query: string,
    filters: any,
    resultCount: number
  ): Promise<ApiResponse<null>> {
    try {
      await prisma.userSearch.create({
        data: {
          userId,
          query,
          filters,
          resultCount,
        },
      });

      return {
        success: true,
        message: 'Search added to history successfully',
      };
    } catch (error) {
      console.error('Add search to history error:', error);
      return {
        success: false,
        error: 'Failed to add search to history',
      };
    }
  }

  /**
   * Clear user search history
   */
  async clearSearchHistory(userId: string): Promise<ApiResponse<null>> {
    try {
      await prisma.userSearch.deleteMany({
        where: { userId },
      });

      return {
        success: true,
        message: 'Search history cleared successfully',
      };
    } catch (error) {
      console.error('Clear search history error:', error);
      return {
        success: false,
        error: 'Failed to clear search history',
      };
    }
  }

  /**
   * Get user favorite opportunities
   */
  async getUserFavorites(userId: string): Promise<ApiResponse<string[]>> {
    try {
      const favorites = await prisma.userFavorite.findMany({
        where: { userId },
        select: { opportunityId: true },
      });

      const favoriteIds = favorites.map(fav => fav.opportunityId);

      return {
        success: true,
        data: favoriteIds,
        message: 'Favorite opportunities retrieved successfully',
      };
    } catch (error) {
      console.error('Get user favorites error:', error);
      return {
        success: false,
        error: 'Failed to retrieve favorite opportunities',
      };
    }
  }

  /**
   * Add opportunity to favorites
   */
  async addToFavorites(
    userId: string,
    opportunityId: string
  ): Promise<ApiResponse<null>> {
    try {
      // Check if already favorited
      const existing = await prisma.userFavorite.findUnique({
        where: {
          userId_opportunityId: {
            userId,
            opportunityId,
          },
        },
      });

      if (existing) {
        return {
          success: false,
          error: 'Opportunity is already in favorites',
        };
      }

      await prisma.userFavorite.create({
        data: {
          userId,
          opportunityId,
        },
      });

      return {
        success: true,
        message: 'Opportunity added to favorites successfully',
      };
    } catch (error) {
      console.error('Add to favorites error:', error);
      return {
        success: false,
        error: 'Failed to add opportunity to favorites',
      };
    }
  }

  /**
   * Remove opportunity from favorites
   */
  async removeFromFavorites(
    userId: string,
    opportunityId: string
  ): Promise<ApiResponse<null>> {
    try {
      const deleted = await prisma.userFavorite.deleteMany({
        where: {
          userId,
          opportunityId,
        },
      });

      if (deleted.count === 0) {
        return {
          success: false,
          error: 'Opportunity not found in favorites',
        };
      }

      return {
        success: true,
        message: 'Opportunity removed from favorites successfully',
      };
    } catch (error) {
      console.error('Remove from favorites error:', error);
      return {
        success: false,
        error: 'Failed to remove opportunity from favorites',
      };
    }
  }
}

export const userService = new UserService();
