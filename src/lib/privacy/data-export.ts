import { PrismaClient } from '@prisma/client';
import { createObjectCsvWriter } from 'csv-writer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DataEncryption } from '../security/data-encryption';

/**
 * User data export functionality for GDPR compliance
 */
export class DataExport {
  private static prisma = new PrismaClient();

  /**
   * Export all user data in JSON format
   */
  static async exportUserDataJSON(userId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const userData = await this.collectUserData(userId);

      if (!userData) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      return {
        success: true,
        data: {
          exportMetadata: {
            userId,
            exportDate: new Date().toISOString(),
            format: 'JSON',
            version: '1.0',
          },
          userData,
        },
      };
    } catch (error) {
      console.error('Error exporting user data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  /**
   * Export user data in CSV format
   */
  static async exportUserDataCSV(userId: string): Promise<{
    success: boolean;
    filePath?: string;
    error?: string;
  }> {
    try {
      const userData = await this.collectUserData(userId);

      if (!userData) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const exportDir = path.join(process.cwd(), 'exports');
      await fs.mkdir(exportDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const baseFileName = `user-data-${userId}-${timestamp}`;

      // Export different data types to separate CSV files
      const files: string[] = [];

      // User profile
      if (userData.profile) {
        const profileFile = path.join(exportDir, `${baseFileName}-profile.csv`);
        await this.writeCSV(profileFile, [userData.profile], 'profile');
        files.push(profileFile);
      }

      // Search history
      if (userData.searchHistory?.length > 0) {
        const searchFile = path.join(exportDir, `${baseFileName}-searches.csv`);
        await this.writeCSV(searchFile, userData.searchHistory, 'searches');
        files.push(searchFile);
      }

      // Roadmaps
      if (userData.roadmaps?.length > 0) {
        const roadmapFile = path.join(
          exportDir,
          `${baseFileName}-roadmaps.csv`
        );
        await this.writeCSV(roadmapFile, userData.roadmaps, 'roadmaps');
        files.push(roadmapFile);
      }

      // Notifications
      if (userData.notifications?.length > 0) {
        const notificationFile = path.join(
          exportDir,
          `${baseFileName}-notifications.csv`
        );
        await this.writeCSV(
          notificationFile,
          userData.notifications,
          'notifications'
        );
        files.push(notificationFile);
      }

      // Consent history
      if (userData.consentHistory?.length > 0) {
        const consentFile = path.join(exportDir, `${baseFileName}-consent.csv`);
        await this.writeCSV(consentFile, userData.consentHistory, 'consent');
        files.push(consentFile);
      }

      return {
        success: true,
        filePath: exportDir,
      };
    } catch (error) {
      console.error('Error exporting user data to CSV:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'CSV export failed',
      };
    }
  }

  /**
   * Collect all user data from various tables
   */
  private static async collectUserData(userId: string): Promise<any | null> {
    try {
      // Get user profile
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          location: true,
          academic: true,
          skills: true,
          preferences: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      });

      if (!user) {
        return null;
      }

      // Decrypt sensitive fields
      const decryptedUser = {
        ...user,
        email: user.email
          ? DataEncryption.decryptField(user.email)
          : user.email,
        phone: user.phone
          ? DataEncryption.decryptField(user.phone)
          : user.phone,
        name: user.name ? DataEncryption.decryptField(user.name) : user.name,
      };

      // Get search history
      const searchHistory = await this.prisma.userSearch.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        select: {
          query: true,
          filters: true,
          timestamp: true,
          resultsCount: true,
        },
      });

      // Get roadmaps
      const roadmaps = await this.prisma.roadmap.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          opportunityId: true,
          title: true,
          phases: true,
          progress: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Get notifications
      const notifications = await this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 1000, // Limit to last 1000 notifications
        select: {
          type: true,
          title: true,
          message: true,
          isRead: true,
          createdAt: true,
        },
      });

      // Get consent history
      const consentHistory = await this.prisma.userConsent.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        select: {
          purpose: true,
          lawfulBasis: true,
          dataCategories: true,
          consentGiven: true,
          consentMethod: true,
          timestamp: true,
        },
      });

      // Get favorite opportunities
      const favoriteOpportunities = await this.prisma.userFavorite.findMany({
        where: { userId },
        include: {
          opportunity: {
            select: {
              id: true,
              title: true,
              type: true,
              organizer: true,
              createdAt: true,
            },
          },
        },
      });

      // Get session history (last 100 sessions)
      const sessionHistory = await this.prisma.userSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          expiresAt: true,
        },
      });

      return {
        profile: decryptedUser,
        searchHistory: searchHistory.map(search => ({
          ...search,
          query: search.query
            ? DataEncryption.decryptField(search.query)
            : search.query,
        })),
        roadmaps,
        notifications,
        consentHistory,
        favoriteOpportunities: favoriteOpportunities.map(fav => ({
          opportunityId: fav.opportunity.id,
          opportunityTitle: fav.opportunity.title,
          opportunityType: fav.opportunity.type,
          organizer: fav.opportunity.organizer,
          favoritedAt: fav.createdAt,
        })),
        sessionHistory: sessionHistory.map(session => ({
          ...session,
          ipAddress: session.ipAddress
            ? DataEncryption.decryptField(session.ipAddress)
            : session.ipAddress,
        })),
        exportSummary: {
          totalSearches: searchHistory.length,
          totalRoadmaps: roadmaps.length,
          totalNotifications: notifications.length,
          totalConsentRecords: consentHistory.length,
          totalFavorites: favoriteOpportunities.length,
          totalSessions: sessionHistory.length,
        },
      };
    } catch (error) {
      console.error('Error collecting user data:', error);
      throw error;
    }
  }

  /**
   * Write data to CSV file
   */
  private static async writeCSV(
    filePath: string,
    data: any[],
    type: string
  ): Promise<void> {
    if (!data || data.length === 0) {
      return;
    }

    const headers = this.getCSVHeaders(type);
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: headers,
    });

    // Flatten complex objects for CSV
    const flattenedData = data.map(item => this.flattenObject(item));

    await csvWriter.writeRecords(flattenedData);
  }

  /**
   * Get CSV headers for different data types
   */
  private static getCSVHeaders(
    type: string
  ): Array<{ id: string; title: string }> {
    const headerMaps: Record<string, Array<{ id: string; title: string }>> = {
      profile: [
        { id: 'id', title: 'User ID' },
        { id: 'email', title: 'Email' },
        { id: 'name', title: 'Name' },
        { id: 'phone', title: 'Phone' },
        { id: 'location', title: 'Location' },
        { id: 'academic', title: 'Academic Info' },
        { id: 'skills', title: 'Skills' },
        { id: 'preferences', title: 'Preferences' },
        { id: 'createdAt', title: 'Account Created' },
        { id: 'updatedAt', title: 'Last Updated' },
        { id: 'lastLoginAt', title: 'Last Login' },
      ],
      searches: [
        { id: 'query', title: 'Search Query' },
        { id: 'filters', title: 'Applied Filters' },
        { id: 'timestamp', title: 'Search Time' },
        { id: 'resultsCount', title: 'Results Count' },
      ],
      roadmaps: [
        { id: 'id', title: 'Roadmap ID' },
        { id: 'opportunityId', title: 'Opportunity ID' },
        { id: 'title', title: 'Title' },
        { id: 'phases', title: 'Phases' },
        { id: 'progress', title: 'Progress' },
        { id: 'createdAt', title: 'Created' },
        { id: 'updatedAt', title: 'Updated' },
      ],
      notifications: [
        { id: 'type', title: 'Type' },
        { id: 'title', title: 'Title' },
        { id: 'message', title: 'Message' },
        { id: 'isRead', title: 'Read Status' },
        { id: 'createdAt', title: 'Created' },
      ],
      consent: [
        { id: 'purpose', title: 'Purpose' },
        { id: 'lawfulBasis', title: 'Lawful Basis' },
        { id: 'dataCategories', title: 'Data Categories' },
        { id: 'consentGiven', title: 'Consent Given' },
        { id: 'consentMethod', title: 'Consent Method' },
        { id: 'timestamp', title: 'Timestamp' },
      ],
    };

    return headerMaps[type] || [];
  }

  /**
   * Flatten nested objects for CSV export
   */
  private static flattenObject(obj: any, prefix = ''): any {
    const flattened: any = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value === null || value === undefined) {
        flattened[newKey] = '';
      } else if (
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !(value instanceof Date)
      ) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        flattened[newKey] = JSON.stringify(value);
      } else if (value instanceof Date) {
        flattened[newKey] = value.toISOString();
      } else {
        flattened[newKey] = String(value);
      }
    }

    return flattened;
  }

  /**
   * Generate data export report
   */
  static async generateExportReport(userId: string): Promise<{
    success: boolean;
    report?: any;
    error?: string;
  }> {
    try {
      const userData = await this.collectUserData(userId);

      if (!userData) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const report = {
        userId,
        exportDate: new Date().toISOString(),
        dataCategories: {
          personalData: {
            description: 'Basic profile information',
            fields: ['name', 'email', 'phone', 'location'],
            recordCount: 1,
          },
          academicData: {
            description: 'Educational background and skills',
            fields: ['academic', 'skills'],
            recordCount: 1,
          },
          behavioralData: {
            description: 'Search history and preferences',
            fields: ['searchHistory', 'preferences'],
            recordCount: userData.searchHistory?.length || 0,
          },
          communicationData: {
            description: 'Notifications and messages',
            fields: ['notifications'],
            recordCount: userData.notifications?.length || 0,
          },
          consentData: {
            description: 'Consent and privacy preferences',
            fields: ['consentHistory'],
            recordCount: userData.consentHistory?.length || 0,
          },
        },
        totalRecords:
          (userData.exportSummary?.totalSearches || 0) +
          (userData.exportSummary?.totalRoadmaps || 0) +
          (userData.exportSummary?.totalNotifications || 0) +
          (userData.exportSummary?.totalConsentRecords || 0) +
          (userData.exportSummary?.totalFavorites || 0) +
          (userData.exportSummary?.totalSessions || 0) +
          1, // +1 for profile
        dataRetentionInfo: {
          profileData: 'Retained until account deletion',
          searchHistory: 'Retained for 1 year',
          notifications: 'Retained for 2 years',
          consentRecords: 'Retained for 7 years (legal requirement)',
          sessionData: 'Retained for 30 days',
        },
        exportFormats: ['JSON', 'CSV'],
        contactInfo: {
          dataProtectionOfficer:
            process.env.DPO_EMAIL || 'privacy@opportunex.com',
          supportEmail: process.env.SUPPORT_EMAIL || 'support@opportunex.com',
        },
      };

      return {
        success: true,
        report,
      };
    } catch (error) {
      console.error('Error generating export report:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Report generation failed',
      };
    }
  }

  /**
   * Schedule automatic data export for user
   */
  static async scheduleDataExport(
    userId: string,
    format: 'JSON' | 'CSV' = 'JSON'
  ): Promise<{
    success: boolean;
    exportId?: string;
    error?: string;
  }> {
    try {
      const exportId = `export_${userId}_${Date.now()}`;

      // In a real implementation, this would queue a background job
      // For now, we'll create a record to track the export request
      await this.prisma.dataExportRequest.create({
        data: {
          id: exportId,
          userId,
          format,
          status: 'PENDING',
          requestedAt: new Date(),
        },
      });

      // Trigger background job (implementation depends on job queue system)
      // await jobQueue.add('data-export', { userId, format, exportId });

      return {
        success: true,
        exportId,
      };
    } catch (error) {
      console.error('Error scheduling data export:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Export scheduling failed',
      };
    }
  }

  /**
   * Get export request status
   */
  static async getExportStatus(exportId: string): Promise<{
    success: boolean;
    status?: string;
    downloadUrl?: string;
    error?: string;
  }> {
    try {
      const exportRequest = await this.prisma.dataExportRequest.findUnique({
        where: { id: exportId },
        select: {
          status: true,
          downloadUrl: true,
          completedAt: true,
          error: true,
        },
      });

      if (!exportRequest) {
        return {
          success: false,
          error: 'Export request not found',
        };
      }

      return {
        success: true,
        status: exportRequest.status,
        downloadUrl: exportRequest.downloadUrl || undefined,
      };
    } catch (error) {
      console.error('Error getting export status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Status check failed',
      };
    }
  }
}
