import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DataEncryption } from '../security/data-encryption';

/**
 * Data deletion mechanisms for GDPR compliance and user privacy
 */
export class DataDeletion {
  private static prisma = new PrismaClient();

  /**
   * Types of data deletion
   */
  static readonly DELETION_TYPES = {
    SOFT_DELETE: 'soft_delete', // Mark as deleted but keep for referential integrity
    HARD_DELETE: 'hard_delete', // Completely remove from database
    ANONYMIZE: 'anonymize', // Remove PII but keep anonymized data for analytics
  } as const;

  /**
   * Reasons for data deletion
   */
  static readonly DELETION_REASONS = {
    USER_REQUEST: 'user_request',
    GDPR_RIGHT_TO_BE_FORGOTTEN: 'gdpr_right_to_be_forgotten',
    ACCOUNT_CLOSURE: 'account_closure',
    DATA_RETENTION_POLICY: 'data_retention_policy',
    LEGAL_REQUIREMENT: 'legal_requirement',
    SECURITY_BREACH: 'security_breach',
  } as const;

  /**
   * Process user data deletion request
   */
  static async processUserDeletionRequest(
    userId: string,
    deletionType: string = this.DELETION_TYPES.SOFT_DELETE,
    reason: string = this.DELETION_REASONS.USER_REQUEST
  ): Promise<{
    success: boolean;
    deletionId?: string;
    summary?: any;
    error?: string;
  }> {
    const deletionId = `del_${userId}_${Date.now()}`;

    try {
      // Create deletion request record
      await this.prisma.dataDeletionRequest.create({
        data: {
          id: deletionId,
          userId,
          deletionType,
          reason,
          status: 'PROCESSING',
          requestedAt: new Date(),
        },
      });

      let summary: any;

      switch (deletionType) {
        case this.DELETION_TYPES.HARD_DELETE:
          summary = await this.hardDeleteUserData(userId);
          break;
        case this.DELETION_TYPES.ANONYMIZE:
          summary = await this.anonymizeUserData(userId);
          break;
        case this.DELETION_TYPES.SOFT_DELETE:
        default:
          summary = await this.softDeleteUserData(userId);
          break;
      }

      // Update deletion request status
      await this.prisma.dataDeletionRequest.update({
        where: { id: deletionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          summary,
        },
      });

      // Log deletion for audit trail
      console.log('User data deletion completed:', {
        deletionId,
        userId,
        deletionType,
        reason,
        summary,
      });

      return {
        success: true,
        deletionId,
        summary,
      };
    } catch (error) {
      console.error('Error processing user deletion request:', error);

      // Update deletion request with error
      try {
        await this.prisma.dataDeletionRequest.update({
          where: { id: deletionId },
          data: {
            status: 'FAILED',
            error: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date(),
          },
        });
      } catch (updateError) {
        console.error('Error updating deletion request status:', updateError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deletion failed',
      };
    }
  }

  /**
   * Soft delete user data (mark as deleted but keep for referential integrity)
   */
  private static async softDeleteUserData(userId: string): Promise<any> {
    const summary = {
      deletionType: 'soft_delete',
      tablesAffected: [],
      recordsModified: 0,
    };

    // Mark user as deleted
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deletedAt: new Date(),
        email: `deleted_${userId}@anonymized.local`,
        name: 'Deleted User',
        phone: null,
        // Keep other fields for referential integrity but mark as deleted
      },
    });
    summary.tablesAffected.push('users');
    summary.recordsModified += 1;

    // Soft delete search history
    const searchCount = await this.prisma.userSearch.updateMany({
      where: { userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        query: null, // Remove sensitive search queries
      },
    });
    if (searchCount.count > 0) {
      summary.tablesAffected.push('user_searches');
      summary.recordsModified += searchCount.count;
    }

    // Soft delete notifications
    const notificationCount = await this.prisma.notification.updateMany({
      where: { userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        message: null, // Remove message content
      },
    });
    if (notificationCount.count > 0) {
      summary.tablesAffected.push('notifications');
      summary.recordsModified += notificationCount.count;
    }

    // Mark roadmaps as deleted but keep structure for analytics
    const roadmapCount = await this.prisma.roadmap.updateMany({
      where: { userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        title: 'Deleted Roadmap',
      },
    });
    if (roadmapCount.count > 0) {
      summary.tablesAffected.push('roadmaps');
      summary.recordsModified += roadmapCount.count;
    }

    return summary;
  }

  /**
   * Hard delete user data (completely remove from database)
   */
  private static async hardDeleteUserData(userId: string): Promise<any> {
    const summary = {
      deletionType: 'hard_delete',
      tablesAffected: [],
      recordsDeleted: 0,
    };

    // Delete in order to respect foreign key constraints

    // Delete user searches
    const searchCount = await this.prisma.userSearch.deleteMany({
      where: { userId },
    });
    if (searchCount.count > 0) {
      summary.tablesAffected.push('user_searches');
      summary.recordsDeleted += searchCount.count;
    }

    // Delete user sessions
    const sessionCount = await this.prisma.userSession.deleteMany({
      where: { userId },
    });
    if (sessionCount.count > 0) {
      summary.tablesAffected.push('user_sessions');
      summary.recordsDeleted += sessionCount.count;
    }

    // Delete notifications
    const notificationCount = await this.prisma.notification.deleteMany({
      where: { userId },
    });
    if (notificationCount.count > 0) {
      summary.tablesAffected.push('notifications');
      summary.recordsDeleted += notificationCount.count;
    }

    // Delete roadmaps
    const roadmapCount = await this.prisma.roadmap.deleteMany({
      where: { userId },
    });
    if (roadmapCount.count > 0) {
      summary.tablesAffected.push('roadmaps');
      summary.recordsDeleted += roadmapCount.count;
    }

    // Delete user favorites
    const favoriteCount = await this.prisma.userFavorite.deleteMany({
      where: { userId },
    });
    if (favoriteCount.count > 0) {
      summary.tablesAffected.push('user_favorites');
      summary.recordsDeleted += favoriteCount.count;
    }

    // Delete consent records
    const consentCount = await this.prisma.userConsent.deleteMany({
      where: { userId },
    });
    if (consentCount.count > 0) {
      summary.tablesAffected.push('user_consents');
      summary.recordsDeleted += consentCount.count;
    }

    // Finally delete the user
    await this.prisma.user.delete({
      where: { id: userId },
    });
    summary.tablesAffected.push('users');
    summary.recordsDeleted += 1;

    return summary;
  }

  /**
   * Anonymize user data (remove PII but keep anonymized data for analytics)
   */
  private static async anonymizeUserData(userId: string): Promise<any> {
    const summary = {
      deletionType: 'anonymize',
      tablesAffected: [],
      recordsAnonymized: 0,
    };

    const anonymousId = `anon_${DataEncryption.generateSecureToken(16)}`;

    // Anonymize user profile
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: `${anonymousId}@anonymized.local`,
        name: 'Anonymous User',
        phone: null,
        isActive: false,
        anonymizedAt: new Date(),
        originalId: userId, // Keep reference for analytics
      },
    });
    summary.tablesAffected.push('users');
    summary.recordsAnonymized += 1;

    // Anonymize search history (keep query patterns but remove personal identifiers)
    const searches = await this.prisma.userSearch.findMany({
      where: { userId },
    });

    for (const search of searches) {
      await this.prisma.userSearch.update({
        where: { id: search.id },
        data: {
          userId: anonymousId,
          query: this.anonymizeSearchQuery(search.query),
          anonymizedAt: new Date(),
        },
      });
    }
    if (searches.length > 0) {
      summary.tablesAffected.push('user_searches');
      summary.recordsAnonymized += searches.length;
    }

    // Anonymize roadmaps (keep structure but remove personal details)
    const roadmaps = await this.prisma.roadmap.findMany({
      where: { userId },
    });

    for (const roadmap of roadmaps) {
      await this.prisma.roadmap.update({
        where: { id: roadmap.id },
        data: {
          userId: anonymousId,
          title: 'Anonymous Roadmap',
          anonymizedAt: new Date(),
        },
      });
    }
    if (roadmaps.length > 0) {
      summary.tablesAffected.push('roadmaps');
      summary.recordsAnonymized += roadmaps.length;
    }

    // Delete sensitive data that cannot be anonymized
    await this.prisma.notification.deleteMany({
      where: { userId },
    });

    await this.prisma.userSession.deleteMany({
      where: { userId },
    });

    await this.prisma.userConsent.deleteMany({
      where: { userId },
    });

    return summary;
  }

  /**
   * Anonymize search query by removing personal identifiers
   */
  private static anonymizeSearchQuery(query: string | null): string | null {
    if (!query) return null;

    try {
      // Decrypt if encrypted
      const decryptedQuery = DataEncryption.decryptField(query);

      // Remove common personal identifiers
      const anonymized = decryptedQuery
        .replace(
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
          '[EMAIL]'
        )
        .replace(/\b\d{10}\b/g, '[PHONE]')
        .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[NAME]')
        .replace(/\b\d{6}\b/g, '[PINCODE]');

      return anonymized;
    } catch (error) {
      // If decryption fails, return null to be safe
      return null;
    }
  }

  /**
   * Delete specific data category for user
   */
  static async deleteDataCategory(
    userId: string,
    category:
      | 'search_history'
      | 'notifications'
      | 'roadmaps'
      | 'sessions'
      | 'favorites'
  ): Promise<{
    success: boolean;
    deletedCount?: number;
    error?: string;
  }> {
    try {
      let deletedCount = 0;

      switch (category) {
        case 'search_history':
          const searchResult = await this.prisma.userSearch.deleteMany({
            where: { userId },
          });
          deletedCount = searchResult.count;
          break;

        case 'notifications':
          const notificationResult = await this.prisma.notification.deleteMany({
            where: { userId },
          });
          deletedCount = notificationResult.count;
          break;

        case 'roadmaps':
          const roadmapResult = await this.prisma.roadmap.deleteMany({
            where: { userId },
          });
          deletedCount = roadmapResult.count;
          break;

        case 'sessions':
          const sessionResult = await this.prisma.userSession.deleteMany({
            where: { userId },
          });
          deletedCount = sessionResult.count;
          break;

        case 'favorites':
          const favoriteResult = await this.prisma.userFavorite.deleteMany({
            where: { userId },
          });
          deletedCount = favoriteResult.count;
          break;

        default:
          throw new Error(`Unknown data category: ${category}`);
      }

      console.log(`Deleted ${category} for user ${userId}:`, { deletedCount });

      return {
        success: true,
        deletedCount,
      };
    } catch (error) {
      console.error(`Error deleting ${category} for user ${userId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deletion failed',
      };
    }
  }

  /**
   * Automated data cleanup based on retention policies
   */
  static async runDataRetentionCleanup(): Promise<{
    success: boolean;
    summary?: any;
    error?: string;
  }> {
    try {
      const summary = {
        cleanupDate: new Date().toISOString(),
        categoriesProcessed: [],
        totalRecordsDeleted: 0,
      };

      const now = new Date();

      // Delete old search history (older than 1 year)
      const searchCutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      const oldSearches = await this.prisma.userSearch.deleteMany({
        where: {
          timestamp: { lt: searchCutoff },
        },
      });
      if (oldSearches.count > 0) {
        summary.categoriesProcessed.push({
          category: 'search_history',
          cutoffDate: searchCutoff.toISOString(),
          recordsDeleted: oldSearches.count,
        });
        summary.totalRecordsDeleted += oldSearches.count;
      }

      // Delete old session data (older than 30 days)
      const sessionCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const oldSessions = await this.prisma.userSession.deleteMany({
        where: {
          createdAt: { lt: sessionCutoff },
        },
      });
      if (oldSessions.count > 0) {
        summary.categoriesProcessed.push({
          category: 'sessions',
          cutoffDate: sessionCutoff.toISOString(),
          recordsDeleted: oldSessions.count,
        });
        summary.totalRecordsDeleted += oldSessions.count;
      }

      // Delete old notifications (older than 2 years)
      const notificationCutoff = new Date(
        now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000
      );
      const oldNotifications = await this.prisma.notification.deleteMany({
        where: {
          createdAt: { lt: notificationCutoff },
        },
      });
      if (oldNotifications.count > 0) {
        summary.categoriesProcessed.push({
          category: 'notifications',
          cutoffDate: notificationCutoff.toISOString(),
          recordsDeleted: oldNotifications.count,
        });
        summary.totalRecordsDeleted += oldNotifications.count;
      }

      // Mark inactive users for review (inactive for 3 years)
      const inactiveCutoff = new Date(
        now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000
      );
      const inactiveUsers = await this.prisma.user.updateMany({
        where: {
          lastLoginAt: { lt: inactiveCutoff },
          isActive: true,
          deletedAt: null,
        },
        data: {
          isActive: false,
          deactivationReason: 'RETENTION_POLICY_INACTIVE',
          deactivatedAt: new Date(),
        },
      });
      if (inactiveUsers.count > 0) {
        summary.categoriesProcessed.push({
          category: 'inactive_users',
          cutoffDate: inactiveCutoff.toISOString(),
          recordsDeactivated: inactiveUsers.count,
        });
      }

      console.log('Data retention cleanup completed:', summary);

      return {
        success: true,
        summary,
      };
    } catch (error) {
      console.error('Error running data retention cleanup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cleanup failed',
      };
    }
  }

  /**
   * Get deletion request status
   */
  static async getDeletionStatus(deletionId: string): Promise<{
    success: boolean;
    status?: any;
    error?: string;
  }> {
    try {
      const deletionRequest = await this.prisma.dataDeletionRequest.findUnique({
        where: { id: deletionId },
        select: {
          id: true,
          userId: true,
          deletionType: true,
          reason: true,
          status: true,
          requestedAt: true,
          completedAt: true,
          summary: true,
          error: true,
        },
      });

      if (!deletionRequest) {
        return {
          success: false,
          error: 'Deletion request not found',
        };
      }

      return {
        success: true,
        status: deletionRequest,
      };
    } catch (error) {
      console.error('Error getting deletion status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Status check failed',
      };
    }
  }

  /**
   * Delete uploaded files associated with user
   */
  static async deleteUserFiles(userId: string): Promise<{
    success: boolean;
    deletedFiles?: string[];
    error?: string;
  }> {
    try {
      const deletedFiles: string[] = [];
      const uploadsDir = path.join(process.cwd(), 'uploads', userId);

      try {
        const files = await fs.readdir(uploadsDir);

        for (const file of files) {
          const filePath = path.join(uploadsDir, file);
          await fs.unlink(filePath);
          deletedFiles.push(file);
        }

        // Remove user directory
        await fs.rmdir(uploadsDir);
      } catch (error) {
        // Directory might not exist, which is fine
        if ((error as any).code !== 'ENOENT') {
          throw error;
        }
      }

      return {
        success: true,
        deletedFiles,
      };
    } catch (error) {
      console.error('Error deleting user files:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'File deletion failed',
      };
    }
  }
}
