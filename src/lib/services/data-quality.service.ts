import { PrismaClient } from '@prisma/client';
import type { ApiResponse, Opportunity } from '../../types';
import { searchService } from './search.service';

const prisma = new PrismaClient();

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  existingOpportunityId?: string;
  similarityScore: number;
  matchedFields: string[];
}

export interface DataQualityScore {
  overall: number;
  completeness: number;
  accuracy: number;
  consistency: number;
  freshness: number;
  details: {
    missingFields: string[];
    inconsistencies: string[];
    qualityIssues: string[];
  };
}

export interface FraudDetectionResult {
  isSuspicious: boolean;
  riskScore: number;
  flags: string[];
  reasons: string[];
}

export interface DataStandardizationResult {
  standardized: Opportunity;
  changes: string[];
  warnings: string[];
}

export class DataQualityService {
  /**
   * Detect duplicate opportunities
   */
  async detectDuplicates(
    opportunity: Opportunity
  ): Promise<ApiResponse<DuplicateDetectionResult>> {
    try {
      // Search for similar opportunities in database
      const similarOpportunities = await prisma.opportunity.findMany({
        where: {
          OR: [
            {
              AND: [
                { title: { contains: opportunity.title, mode: 'insensitive' } },
                { organizerName: opportunity.organizer.name },
              ],
            },
            {
              AND: [
                { organizerName: opportunity.organizer.name },
                {
                  applicationDeadline: opportunity.timeline.applicationDeadline,
                },
              ],
            },
            { externalUrl: opportunity.externalUrl },
          ],
        },
      });

      if (similarOpportunities.length === 0) {
        return {
          success: true,
          data: {
            isDuplicate: false,
            similarityScore: 0,
            matchedFields: [],
          },
          message: 'No duplicates found',
        };
      }

      // Calculate similarity scores
      let bestMatch: any = null;
      let highestScore = 0;

      for (const existing of similarOpportunities) {
        const score = this.calculateSimilarityScore(opportunity, existing);
        if (score > highestScore) {
          highestScore = score;
          bestMatch = existing;
        }
      }

      const isDuplicate = highestScore > 0.8; // 80% similarity threshold
      const matchedFields = this.getMatchedFields(opportunity, bestMatch);

      return {
        success: true,
        data: {
          isDuplicate,
          existingOpportunityId: isDuplicate ? bestMatch.id : undefined,
          similarityScore: highestScore,
          matchedFields,
        },
        message: isDuplicate
          ? 'Duplicate detected'
          : 'Similar opportunities found',
      };
    } catch (error) {
      console.error('Detect duplicates error:', error);
      return {
        success: false,
        error: 'Failed to detect duplicates',
      };
    }
  }

  /**
   * Calculate similarity score between two opportunities
   */
  private calculateSimilarityScore(opp1: Opportunity, opp2: any): number {
    let score = 0;
    let totalWeight = 0;

    // Title similarity (weight: 0.3)
    const titleSimilarity = this.calculateStringSimilarity(
      opp1.title,
      opp2.title
    );
    score += titleSimilarity * 0.3;
    totalWeight += 0.3;

    // Organizer similarity (weight: 0.25)
    const organizerSimilarity = this.calculateStringSimilarity(
      opp1.organizer.name,
      opp2.organizerName
    );
    score += organizerSimilarity * 0.25;
    totalWeight += 0.25;

    // Deadline similarity (weight: 0.2)
    const deadlineDiff = Math.abs(
      opp1.timeline.applicationDeadline.getTime() -
        new Date(opp2.applicationDeadline).getTime()
    );
    const deadlineSimilarity = deadlineDiff < 24 * 60 * 60 * 1000 ? 1 : 0; // Same day
    score += deadlineSimilarity * 0.2;
    totalWeight += 0.2;

    // URL similarity (weight: 0.15)
    const urlSimilarity = opp1.externalUrl === opp2.externalUrl ? 1 : 0;
    score += urlSimilarity * 0.15;
    totalWeight += 0.15;

    // Type similarity (weight: 0.1)
    const typeSimilarity = opp1.type === opp2.type ? 1 : 0;
    score += typeSimilarity * 0.1;
    totalWeight += 0.1;

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;

    const matrix = Array(s2.length + 1)
      .fill(null)
      .map(() => Array(s1.length + 1).fill(null));

    for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= s2.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    const maxLength = Math.max(s1.length, s2.length);
    return maxLength === 0
      ? 1
      : (maxLength - matrix[s2.length][s1.length]) / maxLength;
  }

  /**
   * Get matched fields between opportunities
   */
  private getMatchedFields(opp1: Opportunity, opp2: any): string[] {
    const matched: string[] = [];

    if (this.calculateStringSimilarity(opp1.title, opp2.title) > 0.8) {
      matched.push('title');
    }
    if (
      this.calculateStringSimilarity(opp1.organizer.name, opp2.organizerName) >
      0.8
    ) {
      matched.push('organizer');
    }
    if (opp1.externalUrl === opp2.externalUrl) {
      matched.push('externalUrl');
    }
    if (opp1.type === opp2.type) {
      matched.push('type');
    }

    const deadlineDiff = Math.abs(
      opp1.timeline.applicationDeadline.getTime() -
        new Date(opp2.applicationDeadline).getTime()
    );
    if (deadlineDiff < 24 * 60 * 60 * 1000) {
      matched.push('deadline');
    }

    return matched;
  }

  /**
   * Standardize opportunity data
   */
  async standardizeOpportunity(
    opportunity: Opportunity
  ): Promise<ApiResponse<DataStandardizationResult>> {
    try {
      const standardized = { ...opportunity };
      const changes: string[] = [];
      const warnings: string[] = [];

      // Standardize title
      const originalTitle = standardized.title;
      standardized.title = this.standardizeTitle(standardized.title);
      if (originalTitle !== standardized.title) {
        changes.push(
          `Title standardized: "${originalTitle}" -> "${standardized.title}"`
        );
      }

      // Standardize organizer name
      const originalOrganizer = standardized.organizer.name;
      standardized.organizer.name = this.standardizeOrganizerName(
        standardized.organizer.name
      );
      if (originalOrganizer !== standardized.organizer.name) {
        changes.push(
          `Organizer standardized: "${originalOrganizer}" -> "${standardized.organizer.name}"`
        );
      }

      // Standardize skills
      const originalSkills = [...standardized.requirements.skills];
      standardized.requirements.skills = this.standardizeSkills(
        standardized.requirements.skills
      );
      if (
        JSON.stringify(originalSkills) !==
        JSON.stringify(standardized.requirements.skills)
      ) {
        changes.push(
          `Skills standardized: ${originalSkills.join(', ')} -> ${standardized.requirements.skills.join(', ')}`
        );
      }

      // Standardize location
      if (standardized.details.location) {
        const originalLocation = standardized.details.location;
        standardized.details.location = this.standardizeLocation(
          standardized.details.location
        );
        if (originalLocation !== standardized.details.location) {
          changes.push(
            `Location standardized: "${originalLocation}" -> "${standardized.details.location}"`
          );
        }
      }

      // Standardize tags
      const originalTags = [...standardized.tags];
      standardized.tags = this.standardizeTags(standardized.tags);
      if (JSON.stringify(originalTags) !== JSON.stringify(standardized.tags)) {
        changes.push(
          `Tags standardized: ${originalTags.join(', ')} -> ${standardized.tags.join(', ')}`
        );
      }

      // Validate dates
      if (
        standardized.timeline.startDate &&
        standardized.timeline.startDate <
          standardized.timeline.applicationDeadline
      ) {
        warnings.push('Start date is before application deadline');
      }

      if (
        standardized.timeline.endDate &&
        standardized.timeline.startDate &&
        standardized.timeline.endDate < standardized.timeline.startDate
      ) {
        warnings.push('End date is before start date');
      }

      return {
        success: true,
        data: {
          standardized,
          changes,
          warnings,
        },
        message: 'Opportunity standardized successfully',
      };
    } catch (error) {
      console.error('Standardize opportunity error:', error);
      return {
        success: false,
        error: 'Failed to standardize opportunity',
      };
    }
  }

  /**
   * Standardize title
   */
  private standardizeTitle(title: string): string {
    return title
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\-&()]/g, '') // Remove special characters except common ones
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Standardize organizer name
   */
  private standardizeOrganizerName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(
        /\b(inc|ltd|llc|corp|corporation|company|pvt|private|limited)\b\.?/gi,
        ''
      )
      .trim();
  }

  /**
   * Standardize skills
   */
  private standardizeSkills(skills: string[]): string[] {
    const skillMap: { [key: string]: string } = {
      js: 'JavaScript',
      javascript: 'JavaScript',
      ts: 'TypeScript',
      typescript: 'TypeScript',
      py: 'Python',
      python: 'Python',
      java: 'Java',
      'c++': 'C++',
      cpp: 'C++',
      'c#': 'C#',
      csharp: 'C#',
      html: 'HTML',
      css: 'CSS',
      react: 'React',
      reactjs: 'React',
      vue: 'Vue.js',
      vuejs: 'Vue.js',
      angular: 'Angular',
      node: 'Node.js',
      nodejs: 'Node.js',
      ml: 'Machine Learning',
      ai: 'Artificial Intelligence',
      ds: 'Data Science',
    };

    return skills
      .map(skill => skill.trim().toLowerCase())
      .filter(skill => skill.length > 0)
      .map(
        skill =>
          skillMap[skill] || skill.charAt(0).toUpperCase() + skill.slice(1)
      )
      .filter((skill, index, arr) => arr.indexOf(skill) === index); // Remove duplicates
  }

  /**
   * Standardize location
   */
  private standardizeLocation(location: string): string {
    const locationMap: { [key: string]: string } = {
      mumbai: 'Mumbai',
      bombay: 'Mumbai',
      bangalore: 'Bangalore',
      bengaluru: 'Bangalore',
      delhi: 'Delhi',
      'new delhi': 'Delhi',
      hyderabad: 'Hyderabad',
      chennai: 'Chennai',
      madras: 'Chennai',
      kolkata: 'Kolkata',
      calcutta: 'Kolkata',
      pune: 'Pune',
      ahmedabad: 'Ahmedabad',
      jaipur: 'Jaipur',
      surat: 'Surat',
      lucknow: 'Lucknow',
      kanpur: 'Kanpur',
      nagpur: 'Nagpur',
      indore: 'Indore',
      thane: 'Thane',
      bhopal: 'Bhopal',
      visakhapatnam: 'Visakhapatnam',
      pimpri: 'Pimpri-Chinchwad',
      patna: 'Patna',
      vadodara: 'Vadodara',
      ghaziabad: 'Ghaziabad',
      ludhiana: 'Ludhiana',
      agra: 'Agra',
      nashik: 'Nashik',
      faridabad: 'Faridabad',
      meerut: 'Meerut',
      rajkot: 'Rajkot',
      kalyan: 'Kalyan-Dombivli',
      vasai: 'Vasai-Virar',
      varanasi: 'Varanasi',
      srinagar: 'Srinagar',
      aurangabad: 'Aurangabad',
      dhanbad: 'Dhanbad',
      amritsar: 'Amritsar',
      'navi mumbai': 'Navi Mumbai',
      allahabad: 'Prayagraj',
      prayagraj: 'Prayagraj',
      howrah: 'Howrah',
      ranchi: 'Ranchi',
      gwalior: 'Gwalior',
      jabalpur: 'Jabalpur',
      coimbatore: 'Coimbatore',
    };

    const normalized = location.toLowerCase().trim();
    return locationMap[normalized] || location.trim();
  }

  /**
   * Standardize tags
   */
  private standardizeTags(tags: string[]): string[] {
    return tags
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0)
      .map(tag => tag.charAt(0).toUpperCase() + tag.slice(1))
      .filter((tag, index, arr) => arr.indexOf(tag) === index) // Remove duplicates
      .slice(0, 10); // Limit to 10 tags
  }

  /**
   * Calculate data quality score
   */
  async calculateQualityScore(
    opportunity: Opportunity
  ): Promise<ApiResponse<DataQualityScore>> {
    try {
      const details = {
        missingFields: [] as string[],
        inconsistencies: [] as string[],
        qualityIssues: [] as string[],
      };

      // Check completeness (40% weight)
      let completenessScore = 1.0;
      const requiredFields = [
        'title',
        'description',
        'type',
        'organizer.name',
        'organizer.type',
        'requirements.skills',
        'details.mode',
        'timeline.applicationDeadline',
        'externalUrl',
      ];

      for (const field of requiredFields) {
        const value = this.getNestedValue(opportunity, field);
        if (!value || (Array.isArray(value) && value.length === 0)) {
          details.missingFields.push(field);
          completenessScore -= 0.1;
        }
      }

      completenessScore = Math.max(0, completenessScore);

      // Check accuracy (30% weight)
      let accuracyScore = 1.0;

      // Validate URL
      try {
        new URL(opportunity.externalUrl);
      } catch {
        details.qualityIssues.push('Invalid external URL');
        accuracyScore -= 0.2;
      }

      // Validate dates
      if (opportunity.timeline.applicationDeadline < new Date()) {
        details.qualityIssues.push('Application deadline is in the past');
        accuracyScore -= 0.3;
      }

      if (
        opportunity.timeline.startDate &&
        opportunity.timeline.startDate <
          opportunity.timeline.applicationDeadline
      ) {
        details.inconsistencies.push(
          'Start date is before application deadline'
        );
        accuracyScore -= 0.1;
      }

      accuracyScore = Math.max(0, accuracyScore);

      // Check consistency (20% weight)
      let consistencyScore = 1.0;

      // Check if skills match the opportunity type
      const typeKeywords = {
        hackathon: ['programming', 'coding', 'development', 'tech'],
        internship: ['experience', 'learning', 'training'],
        workshop: ['learning', 'training', 'education', 'skill'],
      };

      const relevantKeywords = typeKeywords[opportunity.type] || [];
      const hasRelevantSkills = opportunity.requirements.skills.some(skill =>
        relevantKeywords.some(keyword => skill.toLowerCase().includes(keyword))
      );

      if (!hasRelevantSkills && opportunity.requirements.skills.length > 0) {
        details.inconsistencies.push('Skills may not match opportunity type');
        consistencyScore -= 0.2;
      }

      consistencyScore = Math.max(0, consistencyScore);

      // Check freshness (10% weight)
      let freshnessScore = 1.0;
      const daysSinceCreated =
        (Date.now() - opportunity.createdAt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceCreated > 30) {
        freshnessScore = Math.max(0, 1 - (daysSinceCreated - 30) / 365);
      }

      // Calculate overall score
      const overallScore =
        completenessScore * 0.4 +
        accuracyScore * 0.3 +
        consistencyScore * 0.2 +
        freshnessScore * 0.1;

      const qualityScore: DataQualityScore = {
        overall: Math.round(overallScore * 100) / 100,
        completeness: Math.round(completenessScore * 100) / 100,
        accuracy: Math.round(accuracyScore * 100) / 100,
        consistency: Math.round(consistencyScore * 100) / 100,
        freshness: Math.round(freshnessScore * 100) / 100,
        details,
      };

      return {
        success: true,
        data: qualityScore,
        message: 'Quality score calculated successfully',
      };
    } catch (error) {
      console.error('Calculate quality score error:', error);
      return {
        success: false,
        error: 'Failed to calculate quality score',
      };
    }
  }

  /**
   * Detect fraud/suspicious opportunities
   */
  async detectFraud(
    opportunity: Opportunity
  ): Promise<ApiResponse<FraudDetectionResult>> {
    try {
      const flags: string[] = [];
      const reasons: string[] = [];
      let riskScore = 0;

      // Check for suspicious keywords in title/description
      const suspiciousKeywords = [
        'guaranteed',
        'easy money',
        'no experience required',
        'work from home guaranteed',
        'instant',
        'urgent',
        'limited time',
        'act now',
        'exclusive opportunity',
        'make money fast',
        'get rich quick',
        'no investment',
        'free money',
      ];

      const text =
        `${opportunity.title} ${opportunity.description}`.toLowerCase();
      const foundSuspiciousKeywords = suspiciousKeywords.filter(keyword =>
        text.includes(keyword)
      );

      if (foundSuspiciousKeywords.length > 0) {
        flags.push('suspicious_keywords');
        reasons.push(
          `Contains suspicious keywords: ${foundSuspiciousKeywords.join(', ')}`
        );
        riskScore += foundSuspiciousKeywords.length * 0.1;
      }

      // Check for unrealistic prizes/stipends
      if (opportunity.details.prizes && opportunity.details.prizes.length > 0) {
        const prizeText = opportunity.details.prizes.join(' ').toLowerCase();
        const prizeNumbers = prizeText.match(/[\d,]+/g);

        if (prizeNumbers) {
          const maxPrize = Math.max(
            ...prizeNumbers.map(n => parseInt(n.replace(/,/g, '')))
          );
          if (maxPrize > 10000000) {
            // 1 crore
            flags.push('unrealistic_prizes');
            reasons.push('Prize amount seems unrealistic');
            riskScore += 0.3;
          }
        }
      }

      // Check for missing contact information
      if (
        !opportunity.organizer.name ||
        opportunity.organizer.name.length < 3
      ) {
        flags.push('missing_organizer_info');
        reasons.push('Organizer information is incomplete');
        riskScore += 0.2;
      }

      // Check for suspicious URLs
      const suspiciousDomains = [
        'bit.ly',
        'tinyurl.com',
        'short.link',
        'tiny.cc',
        'ow.ly',
        'blogspot.com',
        'wordpress.com',
        'wix.com',
        'weebly.com',
      ];

      try {
        const url = new URL(opportunity.externalUrl);
        if (suspiciousDomains.some(domain => url.hostname.includes(domain))) {
          flags.push('suspicious_url');
          reasons.push('Uses suspicious or shortened URL');
          riskScore += 0.2;
        }
      } catch {
        flags.push('invalid_url');
        reasons.push('Invalid or malformed URL');
        riskScore += 0.3;
      }

      // Check for unrealistic deadlines
      const daysUntilDeadline =
        (opportunity.timeline.applicationDeadline.getTime() - Date.now()) /
        (1000 * 60 * 60 * 24);

      if (daysUntilDeadline < 1) {
        flags.push('urgent_deadline');
        reasons.push('Extremely short application deadline');
        riskScore += 0.2;
      } else if (daysUntilDeadline > 365) {
        flags.push('distant_deadline');
        reasons.push('Unusually distant application deadline');
        riskScore += 0.1;
      }

      // Check for duplicate organizer with different details
      const similarOpportunities = await prisma.opportunity.findMany({
        where: {
          organizerName: opportunity.organizer.name,
          NOT: { id: opportunity.id },
        },
        take: 5,
      });

      if (similarOpportunities.length > 10) {
        flags.push('prolific_organizer');
        reasons.push('Organizer has posted many opportunities');
        riskScore += 0.1;
      }

      riskScore = Math.min(1, riskScore); // Cap at 1.0
      const isSuspicious = riskScore > 0.5 || flags.length > 2;

      return {
        success: true,
        data: {
          isSuspicious,
          riskScore: Math.round(riskScore * 100) / 100,
          flags,
          reasons,
        },
        message: 'Fraud detection completed',
      };
    } catch (error) {
      console.error('Detect fraud error:', error);
      return {
        success: false,
        error: 'Failed to detect fraud',
      };
    }
  }

  /**
   * Clean up expired opportunities
   */
  async cleanupExpiredOpportunities(): Promise<
    ApiResponse<{ removed: number }>
  > {
    try {
      const expiredOpportunities = await prisma.opportunity.findMany({
        where: {
          applicationDeadline: { lt: new Date() },
          isActive: true,
        },
      });

      // Mark as inactive instead of deleting
      const result = await prisma.opportunity.updateMany({
        where: {
          applicationDeadline: { lt: new Date() },
          isActive: true,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      // Remove from search index
      for (const opportunity of expiredOpportunities) {
        await searchService.removeOpportunity(opportunity.id);
      }

      return {
        success: true,
        data: { removed: result.count },
        message: `Cleaned up ${result.count} expired opportunities`,
      };
    } catch (error) {
      console.error('Cleanup expired opportunities error:', error);
      return {
        success: false,
        error: 'Failed to cleanup expired opportunities',
      };
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Merge duplicate opportunities
   */
  async mergeDuplicateOpportunities(
    primaryId: string,
    duplicateId: string
  ): Promise<ApiResponse<null>> {
    try {
      const [primary, duplicate] = await Promise.all([
        prisma.opportunity.findUnique({ where: { id: primaryId } }),
        prisma.opportunity.findUnique({ where: { id: duplicateId } }),
      ]);

      if (!primary || !duplicate) {
        return {
          success: false,
          error: 'One or both opportunities not found',
        };
      }

      // Merge data (keep primary, enhance with duplicate data where missing)
      const mergedData: any = {
        description: primary.description || duplicate.description,
        requiredSkills: [
          ...new Set([...primary.requiredSkills, ...duplicate.requiredSkills]),
        ],
        experienceRequired:
          primary.experienceRequired || duplicate.experienceRequired,
        educationRequired:
          primary.educationRequired || duplicate.educationRequired,
        eligibilityCriteria: [
          ...new Set([
            ...primary.eligibilityCriteria,
            ...duplicate.eligibilityCriteria,
          ]),
        ],
        location: primary.location || duplicate.location,
        duration: primary.duration || duplicate.duration,
        stipend: primary.stipend || duplicate.stipend,
        prizes: [...new Set([...primary.prizes, ...duplicate.prizes])],
        tags: [...new Set([...primary.tags, ...duplicate.tags])],
        updatedAt: new Date(),
      };

      // Update primary opportunity
      await prisma.opportunity.update({
        where: { id: primaryId },
        data: mergedData,
      });

      // Mark duplicate as inactive
      await prisma.opportunity.update({
        where: { id: duplicateId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      // Remove duplicate from search index
      await searchService.removeOpportunity(duplicateId);

      return {
        success: true,
        message: 'Opportunities merged successfully',
      };
    } catch (error) {
      console.error('Merge duplicate opportunities error:', error);
      return {
        success: false,
        error: 'Failed to merge duplicate opportunities',
      };
    }
  }
}

export const dataQualityService = new DataQualityService();
