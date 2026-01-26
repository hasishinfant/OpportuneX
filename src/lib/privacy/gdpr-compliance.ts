import { PrismaClient } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';

/**
 * GDPR Compliance utilities and middleware
 */
export class GDPRCompliance {
  private static prisma = new PrismaClient();

  /**
   * Data processing lawful bases under GDPR
   */
  static readonly LAWFUL_BASES = {
    CONSENT: 'consent',
    CONTRACT: 'contract',
    LEGAL_OBLIGATION: 'legal_obligation',
    VITAL_INTERESTS: 'vital_interests',
    PUBLIC_TASK: 'public_task',
    LEGITIMATE_INTERESTS: 'legitimate_interests',
  } as const;

  /**
   * Data categories for GDPR compliance
   */
  static readonly DATA_CATEGORIES = {
    PERSONAL: 'personal', // Name, email, phone
    ACADEMIC: 'academic', // Education details, skills
    BEHAVIORAL: 'behavioral', // Search history, preferences
    TECHNICAL: 'technical', // IP address, device info
    COMMUNICATION: 'communication', // Messages, notifications
  } as const;

  /**
   * Record user consent for data processing
   */
  static async recordConsent(userId: string, consentData: {
    purpose: string;
    lawfulBasis: string;
    dataCategories: string[];
    consentGiven: boolean;
    consentMethod: 'explicit' | 'implicit' | 'opt_in' | 'pre_checked';
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.prisma.userConsent.create({
        data: {
          userId,
          purpose: consentData.purpose,
          lawfulBasis: consentData.lawfulBasis,
          dataCategories: consentData.dataCategories,
          consentGiven: consentData.consentGiven,
          consentMethod: consentData.consentMethod,
          ipAddress: consentData.ipAddress,
          userAgent: consentData.userAgent,
          timestamp: new Date(),
        },
      });

      console.log('Consent recorded:', {
        userId,
        purpose: consentData.purpose,
        consentGiven: consentData.consentGiven,
      });
    } catch (error) {
      console.error('Error recording consent:', error);
      throw new Error('Failed to record consent');
    }
  }

  /**
   * Check if user has given consent for specific purpose
   */
  static async hasConsent(userId: string, purpose: string): Promise<boolean> {
    try {
      const consent = await this.prisma.userConsent.findFirst({
        where: {
          userId,
          purpose,
          consentGiven: true,
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      return !!consent;
    } catch (error) {
      console.error('Error checking consent:', error);
      return false;
    }
  }

  /**
   * Withdraw user consent
   */
  static async withdrawConsent(userId: string, purpose: string): Promise<void> {
    try {
      await this.prisma.userConsent.create({
        data: {
          userId,
          purpose,
          lawfulBasis: this.LAWFUL_BASES.CONSENT,
          dataCategories: [],
          consentGiven: false,
          consentMethod: 'explicit',
          timestamp: new Date(),
        },
      });

      console.log('Consent withdrawn:', { userId, purpose });
    } catch (error) {
      console.error('Error withdrawing consent:', error);
      throw new Error('Failed to withdraw consent');
    }
  }

  /**
   * Get user's consent history
   */
  static async getConsentHistory(userId: string): Promise<any[]> {
    try {
      return await this.prisma.userConsent.findMany({
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
    } catch (error) {
      console.error('Error getting consent history:', error);
      return [];
    }
  }

  /**
   * Data retention policy enforcement
   */
  static async enforceDataRetention(): Promise<void> {
    try {
      const retentionPeriods = {
        searchHistory: 365, // 1 year
        sessionData: 30, // 30 days
        analyticsData: 730, // 2 years
        inactiveUsers: 1095, // 3 years
      };

      const now = new Date();

      // Delete old search history
      const searchCutoff = new Date(now.getTime() - retentionPeriods.searchHistory * 24 * 60 * 60 * 1000);
      await this.prisma.userSearch.deleteMany({
        where: {
          timestamp: { lt: searchCutoff },
        },
      });

      // Delete old session data
      const sessionCutoff = new Date(now.getTime() - retentionPeriods.sessionData * 24 * 60 * 60 * 1000);
      await this.prisma.userSession.deleteMany({
        where: {
          createdAt: { lt: sessionCutoff },
        },
      });

      // Mark inactive users for review
      const inactiveCutoff = new Date(now.getTime() - retentionPeriods.inactiveUsers * 24 * 60 * 60 * 1000);
      await this.prisma.user.updateMany({
        where: {
          lastLoginAt: { lt: inactiveCutoff },
          isActive: true,
        },
        data: {
          isActive: false,
          deactivationReason: 'GDPR_RETENTION_POLICY',
        },
      });

      console.log('Data retention policy enforced');
    } catch (error) {
      console.error('Error enforcing data retention:', error);
    }
  }

  /**
   * Generate data processing record for GDPR Article 30
   */
  static generateProcessingRecord(): any {
    return {
      controller: {
        name: 'OpportuneX',
        contact: process.env.DPO_EMAIL || 'privacy@opportunex.com',
        representative: process.env.EU_REPRESENTATIVE,
      },
      purposes: [
        {
          purpose: 'Opportunity Discovery',
          lawfulBasis: this.LAWFUL_BASES.LEGITIMATE_INTERESTS,
          dataCategories: [this.DATA_CATEGORIES.PERSONAL, this.DATA_CATEGORIES.ACADEMIC],
          dataSubjects: 'Students seeking opportunities',
          recipients: 'Internal systems, opportunity providers',
          retentionPeriod: '3 years from last activity',
          securityMeasures: 'Encryption, access controls, audit logging',
        },
        {
          purpose: 'AI-Powered Recommendations',
          lawfulBasis: this.LAWFUL_BASES.CONSENT,
          dataCategories: [this.DATA_CATEGORIES.BEHAVIORAL, this.DATA_CATEGORIES.ACADEMIC],
          dataSubjects: 'Registered users',
          recipients: 'AI processing systems',
          retentionPeriod: '2 years from consent withdrawal',
          securityMeasures: 'Pseudonymization, encryption',
        },
        {
          purpose: 'Communication and Notifications',
          lawfulBasis: this.LAWFUL_BASES.CONSENT,
          dataCategories: [this.DATA_CATEGORIES.PERSONAL, this.DATA_CATEGORIES.COMMUNICATION],
          dataSubjects: 'Users who opted in to notifications',
          recipients: 'Email/SMS service providers',
          retentionPeriod: 'Until consent withdrawn',
          securityMeasures: 'Encrypted transmission, access logging',
        },
      ],
      transfers: [
        {
          recipient: 'OpenAI (US)',
          safeguards: 'Standard Contractual Clauses',
          purpose: 'AI processing for roadmap generation',
        },
        {
          recipient: 'SendGrid (US)',
          safeguards: 'Privacy Shield / Adequacy Decision',
          purpose: 'Email delivery',
        },
      ],
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Middleware to check GDPR consent before processing
   */
  static checkConsent = (purpose: string, required: boolean = true) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user?.id;

      if (!userId) {
        if (required) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required',
            message: 'User authentication required for GDPR compliance.',
          });
        }
        return next();
      }

      try {
        const hasConsent = await GDPRCompliance.hasConsent(userId, purpose);

        if (required && !hasConsent) {
          return res.status(403).json({
            success: false,
            error: 'Consent required',
            message: `Consent required for ${purpose}. Please update your privacy preferences.`,
            consentRequired: {
              purpose,
              description: GDPRCompliance.getConsentDescription(purpose),
              lawfulBasis: GDPRCompliance.getLawfulBasis(purpose),
            },
          });
        }

        // Add consent status to request for logging
        (req as any).gdprConsent = {
          purpose,
          hasConsent,
          required,
        };

        next();
      } catch (error) {
        console.error('Error checking GDPR consent:', error);
        res.status(500).json({
          success: false,
          error: 'Consent check failed',
          message: 'Unable to verify consent status.',
        });
      }
    };
  };

  /**
   * Get consent description for user-facing text
   */
  private static getConsentDescription(purpose: string): string {
    const descriptions: Record<string, string> = {
      'opportunity_discovery': 'Process your profile and preferences to find relevant opportunities',
      'ai_recommendations': 'Use AI to generate personalized preparation roadmaps',
      'notifications': 'Send you email and SMS notifications about opportunities',
      'analytics': 'Analyze usage patterns to improve our service',
      'marketing': 'Send promotional content about new features',
    };

    return descriptions[purpose] || 'Process your data for the specified purpose';
  }

  /**
   * Get lawful basis for processing
   */
  private static getLawfulBasis(purpose: string): string {
    const bases: Record<string, string> = {
      'opportunity_discovery': this.LAWFUL_BASES.LEGITIMATE_INTERESTS,
      'ai_recommendations': this.LAWFUL_BASES.CONSENT,
      'notifications': this.LAWFUL_BASES.CONSENT,
      'analytics': this.LAWFUL_BASES.LEGITIMATE_INTERESTS,
      'marketing': this.LAWFUL_BASES.CONSENT,
    };

    return bases[purpose] || this.LAWFUL_BASES.CONSENT;
  }

  /**
   * Cookie consent management
   */
  static cookieConsentMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const cookieConsent = req.cookies['cookie-consent'];
    
    if (!cookieConsent) {
      // Set essential cookies only
      res.locals.cookieConsent = {
        essential: true,
        analytics: false,
        marketing: false,
        preferences: false,
      };
    } else {
      try {
        res.locals.cookieConsent = JSON.parse(cookieConsent);
      } catch {
        res.locals.cookieConsent = {
          essential: true,
          analytics: false,
          marketing: false,
          preferences: false,
        };
      }
    }

    next();
  };

  /**
   * Data minimization check
   */
  static minimizeData = (data: any, purpose: string): any => {
    const dataMinimizationRules: Record<string, string[]> = {
      'opportunity_discovery': ['name', 'email', 'skills', 'location', 'preferences'],
      'ai_recommendations': ['skills', 'academic', 'searchHistory', 'preferences'],
      'notifications': ['name', 'email', 'phone', 'notificationPreferences'],
      'analytics': ['userId', 'timestamp', 'action', 'metadata'],
    };

    const allowedFields = dataMinimizationRules[purpose] || [];
    
    if (allowedFields.length === 0) {
      return data; // No restrictions defined
    }

    const minimizedData: any = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        minimizedData[field] = data[field];
      }
    }

    return minimizedData;
  };

  /**
   * Pseudonymization utility
   */
  static pseudonymize = (data: any, fields: string[]): any => {
    const crypto = require('crypto');
    const pseudonymizedData = { ...data };

    for (const field of fields) {
      if (pseudonymizedData[field]) {
        const hash = crypto.createHash('sha256')
          .update(pseudonymizedData[field] + process.env.PSEUDONYM_SALT)
          .digest('hex');
        pseudonymizedData[field] = `pseudo_${hash.substring(0, 16)}`;
      }
    }

    return pseudonymizedData;
  };

  /**
   * Right to be forgotten implementation
   */
  static async processDataDeletionRequest(userId: string): Promise<{
    success: boolean;
    deletedRecords: Record<string, number>;
    errors: string[];
  }> {
    const deletedRecords: Record<string, number> = {};
    const errors: string[] = [];

    try {
      // Delete user searches
      const searchCount = await this.prisma.userSearch.count({ where: { userId } });
      await this.prisma.userSearch.deleteMany({ where: { userId } });
      deletedRecords.searches = searchCount;

      // Delete user sessions
      const sessionCount = await this.prisma.userSession.count({ where: { userId } });
      await this.prisma.userSession.deleteMany({ where: { userId } });
      deletedRecords.sessions = sessionCount;

      // Delete consent records
      const consentCount = await this.prisma.userConsent.count({ where: { userId } });
      await this.prisma.userConsent.deleteMany({ where: { userId } });
      deletedRecords.consents = consentCount;

      // Delete notifications
      const notificationCount = await this.prisma.notification.count({ where: { userId } });
      await this.prisma.notification.deleteMany({ where: { userId } });
      deletedRecords.notifications = notificationCount;

      // Delete roadmaps
      const roadmapCount = await this.prisma.roadmap.count({ where: { userId } });
      await this.prisma.roadmap.deleteMany({ where: { userId } });
      deletedRecords.roadmaps = roadmapCount;

      // Anonymize user record (keep for referential integrity)
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted_${userId}@anonymized.local`,
          name: 'Deleted User',
          phone: null,
          location: null,
          academic: null,
          skills: null,
          preferences: null,
          isActive: false,
          deletedAt: new Date(),
        },
      });
      deletedRecords.userProfile = 1;

      return {
        success: true,
        deletedRecords,
        errors,
      };
    } catch (error) {
      console.error('Error processing data deletion request:', error);
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        deletedRecords,
        errors,
      };
    }
  }
}