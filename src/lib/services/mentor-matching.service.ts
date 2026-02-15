// Mentor Matching Service
// Intelligent algorithm to match students with appropriate mentors

import {
  CreateMentorProfileRequest,
  CreateMentorshipRequestRequest,
  CreateReviewRequest,
  MatchingCriteria,
  MentorAnalytics,
  MentorAvailability,
  MentorMatch,
  MentorProfile,
  MentorReview,
  MentorshipRequest,
  MentorshipSession,
  ScheduleSessionRequest,
  StudentMentorshipStats,
  TimeSlot,
  UpdateMentorProfileRequest,
  UpdateSessionRequest,
} from '@/types/mentor-matching';
import { Pool } from 'pg';

export class MentorMatchingService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // ==================== Mentor Profile Management ====================

  async createMentorProfile(
    userId: string,
    data: CreateMentorProfileRequest
  ): Promise<MentorProfile> {
    const query = `
      INSERT INTO mentor_profiles (
        user_id, bio, expertise_areas, domains, years_of_experience,
        current_role, current_company, languages, timezone, hourly_rate,
        max_mentees, linkedin_url, github_url, portfolio_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      userId,
      data.bio,
      data.expertiseAreas,
      data.domains,
      data.yearsOfExperience,
      data.currentRole,
      data.currentCompany,
      data.languages,
      data.timezone,
      data.hourlyRate,
      data.maxMentees || 5,
      data.linkedinUrl,
      data.githubUrl,
      data.portfolioUrl,
    ];

    const result = await this.pool.query(query, values);
    return this.mapMentorProfile(result.rows[0]);
  }

  async updateMentorProfile(
    mentorId: string,
    data: UpdateMentorProfileRequest
  ): Promise<MentorProfile> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        const snakeKey = this.camelToSnake(key);
        updates.push(`${snakeKey} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    updates.push(`updated_at = NOW()`);
    values.push(mentorId);

    const query = `
      UPDATE mentor_profiles
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return this.mapMentorProfile(result.rows[0]);
  }

  async getMentorProfile(mentorId: string): Promise<MentorProfile | null> {
    const query = `
      SELECT * FROM mentor_profiles WHERE id = $1
    `;
    const result = await this.pool.query(query, [mentorId]);
    return result.rows[0] ? this.mapMentorProfile(result.rows[0]) : null;
  }

  async getMentorProfileByUserId(
    userId: string
  ): Promise<MentorProfile | null> {
    const query = `
      SELECT * FROM mentor_profiles WHERE user_id = $1
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows[0] ? this.mapMentorProfile(result.rows[0]) : null;
  }

  // ==================== Availability Management ====================

  async setMentorAvailability(
    mentorId: string,
    availability: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }>
  ): Promise<MentorAvailability[]> {
    // Clear existing availability
    await this.pool.query(
      'DELETE FROM mentor_availability WHERE mentor_id = $1',
      [mentorId]
    );

    // Insert new availability
    const insertPromises = availability.map(slot => {
      const query = `
        INSERT INTO mentor_availability (mentor_id, day_of_week, start_time, end_time)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      return this.pool.query(query, [
        mentorId,
        slot.dayOfWeek,
        slot.startTime,
        slot.endTime,
      ]);
    });

    const results = await Promise.all(insertPromises);
    return results.map(r => this.mapAvailability(r.rows[0]));
  }

  async getMentorAvailability(mentorId: string): Promise<MentorAvailability[]> {
    const query = `
      SELECT * FROM mentor_availability
      WHERE mentor_id = $1 AND is_active = true
      ORDER BY day_of_week, start_time
    `;
    const result = await this.pool.query(query, [mentorId]);
    return result.rows.map(this.mapAvailability);
  }

  // ==================== Matching Algorithm ====================

  async findMatchingMentors(
    criteria: MatchingCriteria
  ): Promise<MentorMatch[]> {
    const query = `
      SELECT 
        mp.*,
        u.name as mentor_name,
        u.email as mentor_email
      FROM mentor_profiles mp
      JOIN users u ON mp.user_id = u.id
      WHERE mp.is_available = true
        AND mp.current_mentees < mp.max_mentees
    `;

    const result = await this.pool.query(query);
    const mentors = result.rows.map(this.mapMentorProfile);

    // Calculate match scores for each mentor
    const matches: MentorMatch[] = [];

    for (const mentor of mentors) {
      const matchScore = await this.calculateMatchScore(mentor, criteria);

      if (matchScore.totalScore > 0) {
        const availableSlots = await this.getAvailableTimeSlots(mentor.id);

        matches.push({
          mentor,
          matchScore: matchScore.totalScore,
          scoreBreakdown: matchScore.breakdown,
          availableSlots,
          reasoning: this.generateMatchReasoning(matchScore.breakdown),
        });
      }
    }

    // Sort by match score descending
    matches.sort((a, b) => b.matchScore - a.matchScore);

    // Return top results
    const maxResults = criteria.maxResults || 10;
    return matches.slice(0, maxResults);
  }

  private async calculateMatchScore(
    mentor: MentorProfile,
    criteria: MatchingCriteria
  ): Promise<{
    totalScore: number;
    breakdown: {
      skillMatch: number;
      domainMatch: number;
      languageMatch: number;
      availabilityMatch: number;
      experienceMatch: number;
      successRateScore: number;
      availabilityScore: number;
    };
  }> {
    // Weights for different factors
    const weights = {
      skills: 0.25,
      domains: 0.2,
      languages: 0.15,
      availability: 0.15,
      experience: 0.1,
      successRate: 0.1,
      mentorAvailability: 0.05,
    };

    // Calculate skill match score (0-100)
    const skillMatch = this.calculateArrayOverlap(
      criteria.skills || [],
      mentor.expertiseAreas
    );

    // Calculate domain match score (0-100)
    const domainMatch = this.calculateArrayOverlap(
      criteria.domains || [],
      mentor.domains
    );

    // Calculate language match score (0-100)
    const languageMatch = this.calculateArrayOverlap(
      criteria.languages || [],
      mentor.languages
    );

    // Calculate availability match (0-100)
    let availabilityMatch = 50; // Default neutral score
    if (criteria.availability) {
      const mentorAvailability = await this.getMentorAvailability(mentor.id);
      availabilityMatch = this.checkAvailabilityMatch(
        criteria.availability,
        mentorAvailability
      );
    }

    // Calculate experience match (0-100)
    const experienceMatch = this.calculateExperienceMatch(
      criteria.experienceLevel,
      mentor.yearsOfExperience
    );

    // Success rate score (0-100)
    const successRateScore = mentor.successRate;

    // Mentor availability score (0-100)
    const availabilityScore = mentor.isAvailable
      ? ((mentor.maxMentees - mentor.currentMentees) / mentor.maxMentees) * 100
      : 0;

    // Calculate weighted total score
    const totalScore =
      skillMatch * weights.skills +
      domainMatch * weights.domains +
      languageMatch * weights.languages +
      availabilityMatch * weights.availability +
      experienceMatch * weights.experience +
      successRateScore * weights.successRate +
      availabilityScore * weights.mentorAvailability;

    return {
      totalScore: Math.round(totalScore * 100) / 100,
      breakdown: {
        skillMatch: Math.round(skillMatch),
        domainMatch: Math.round(domainMatch),
        languageMatch: Math.round(languageMatch),
        availabilityMatch: Math.round(availabilityMatch),
        experienceMatch: Math.round(experienceMatch),
        successRateScore: Math.round(successRateScore),
        availabilityScore: Math.round(availabilityScore),
      },
    };
  }

  private calculateArrayOverlap(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0) return 50; // Neutral score if no criteria
    if (arr2.length === 0) return 0;

    const set1 = new Set(arr1.map(s => s.toLowerCase()));
    const set2 = new Set(arr2.map(s => s.toLowerCase()));

    let matches = 0;
    set1.forEach(item => {
      if (set2.has(item)) matches++;
    });

    return (matches / arr1.length) * 100;
  }

  private checkAvailabilityMatch(
    requested: { dayOfWeek: number; timeSlot: string },
    mentorAvailability: MentorAvailability[]
  ): number {
    const matchingSlots = mentorAvailability.filter(
      slot => slot.dayOfWeek === requested.dayOfWeek
    );

    if (matchingSlots.length === 0) return 0;

    // Check if requested time falls within any mentor slot
    const [reqHour, reqMin] = requested.timeSlot.split(':').map(Number);
    const requestedMinutes = reqHour * 60 + reqMin;

    for (const slot of matchingSlots) {
      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (requestedMinutes >= startMinutes && requestedMinutes <= endMinutes) {
        return 100;
      }
    }

    return 30; // Partial match - same day but different time
  }

  private calculateExperienceMatch(
    requestedLevel: string | undefined,
    mentorYears: number
  ): number {
    if (!requestedLevel) return 50; // Neutral if no preference

    const levelMap: { [key: string]: { min: number; max: number } } = {
      beginner: { min: 0, max: 3 },
      intermediate: { min: 2, max: 7 },
      advanced: { min: 5, max: 100 },
    };

    const range = levelMap[requestedLevel];
    if (!range) return 50;

    if (mentorYears >= range.min && mentorYears <= range.max) {
      return 100;
    } else if (mentorYears > range.max) {
      return 80; // Overqualified but still good
    } else {
      return 30; // Underqualified
    }
  }

  private generateMatchReasoning(breakdown: any): string {
    const reasons: string[] = [];

    if (breakdown.skillMatch >= 70) {
      reasons.push('Strong skill alignment');
    }
    if (breakdown.domainMatch >= 70) {
      reasons.push('Matching domain expertise');
    }
    if (breakdown.languageMatch >= 80) {
      reasons.push('Common language proficiency');
    }
    if (breakdown.experienceMatch >= 80) {
      reasons.push('Appropriate experience level');
    }
    if (breakdown.successRateScore >= 80) {
      reasons.push('High success rate');
    }
    if (breakdown.availabilityScore >= 60) {
      reasons.push('Available capacity');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'General compatibility';
  }

  private async getAvailableTimeSlots(mentorId: string): Promise<TimeSlot[]> {
    const availability = await this.getMentorAvailability(mentorId);
    return availability.map(slot => ({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));
  }

  // ==================== Mentorship Requests ====================

  async createMentorshipRequest(
    studentId: string,
    data: CreateMentorshipRequestRequest
  ): Promise<MentorshipRequest> {
    const query = `
      INSERT INTO mentorship_requests (
        student_id, mentor_id, request_type, topic, description,
        preferred_languages, urgency
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      studentId,
      data.mentorId || null,
      data.requestType,
      data.topic,
      data.description,
      data.preferredLanguages,
      data.urgency || 'normal',
    ];

    const result = await this.pool.query(query, values);
    return this.mapMentorshipRequest(result.rows[0]);
  }

  async updateMentorshipRequest(
    requestId: string,
    updates: Partial<MentorshipRequest>
  ): Promise<MentorshipRequest> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        const snakeKey = this.camelToSnake(key);
        updateFields.push(`${snakeKey} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    updateFields.push(`updated_at = NOW()`);
    values.push(requestId);

    const query = `
      UPDATE mentorship_requests
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return this.mapMentorshipRequest(result.rows[0]);
  }

  async getMentorshipRequest(
    requestId: string
  ): Promise<MentorshipRequest | null> {
    const query = `SELECT * FROM mentorship_requests WHERE id = $1`;
    const result = await this.pool.query(query, [requestId]);
    return result.rows[0] ? this.mapMentorshipRequest(result.rows[0]) : null;
  }

  async getStudentRequests(studentId: string): Promise<MentorshipRequest[]> {
    const query = `
      SELECT * FROM mentorship_requests
      WHERE student_id = $1
      ORDER BY requested_at DESC
    `;
    const result = await this.pool.query(query, [studentId]);
    return result.rows.map(this.mapMentorshipRequest);
  }

  async getMentorRequests(mentorId: string): Promise<MentorshipRequest[]> {
    const query = `
      SELECT * FROM mentorship_requests
      WHERE mentor_id = $1
      ORDER BY requested_at DESC
    `;
    const result = await this.pool.query(query, [mentorId]);
    return result.rows.map(this.mapMentorshipRequest);
  }

  // ==================== Session Management ====================

  async scheduleSession(
    data: ScheduleSessionRequest
  ): Promise<MentorshipSession> {
    const query = `
      INSERT INTO mentorship_sessions (
        mentor_id, student_id, request_id, title, description, agenda,
        scheduled_at, duration_minutes, meeting_platform
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      data.mentorId,
      data.requestId, // This should be studentId, will fix in the interface
      data.requestId,
      data.title,
      data.description,
      data.agenda,
      data.scheduledAt,
      data.durationMinutes || 60,
      data.meetingPlatform,
    ];

    const result = await this.pool.query(query, values);
    return this.mapSession(result.rows[0]);
  }

  async updateSession(
    sessionId: string,
    updates: UpdateSessionRequest
  ): Promise<MentorshipSession> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.status) {
      updateFields.push(`status = $${paramCount}`);
      values.push(updates.status);
      paramCount++;
    }

    if (updates.notes) {
      updateFields.push(`notes = $${paramCount}`);
      values.push(updates.notes);
      paramCount++;
    }

    if (updates.actionItems) {
      updateFields.push(`action_items = $${paramCount}`);
      values.push(JSON.stringify(updates.actionItems));
      paramCount++;
    }

    if (updates.followUpDate) {
      updateFields.push(`follow_up_date = $${paramCount}`);
      values.push(updates.followUpDate);
      paramCount++;
    }

    if (updates.actualDurationMinutes) {
      updateFields.push(`actual_duration_minutes = $${paramCount}`);
      values.push(updates.actualDurationMinutes);
      paramCount++;
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(sessionId);

    const query = `
      UPDATE mentorship_sessions
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return this.mapSession(result.rows[0]);
  }

  async getSession(sessionId: string): Promise<MentorshipSession | null> {
    const query = `SELECT * FROM mentorship_sessions WHERE id = $1`;
    const result = await this.pool.query(query, [sessionId]);
    return result.rows[0] ? this.mapSession(result.rows[0]) : null;
  }

  async getMentorSessions(
    mentorId: string,
    status?: string
  ): Promise<MentorshipSession[]> {
    let query = `
      SELECT * FROM mentorship_sessions
      WHERE mentor_id = $1
    `;
    const values: any[] = [mentorId];

    if (status) {
      query += ` AND status = $2`;
      values.push(status);
    }

    query += ` ORDER BY scheduled_at DESC`;

    const result = await this.pool.query(query, values);
    return result.rows.map(this.mapSession);
  }

  async getStudentSessions(
    studentId: string,
    status?: string
  ): Promise<MentorshipSession[]> {
    let query = `
      SELECT * FROM mentorship_sessions
      WHERE student_id = $1
    `;
    const values: any[] = [studentId];

    if (status) {
      query += ` AND status = $2`;
      values.push(status);
    }

    query += ` ORDER BY scheduled_at DESC`;

    const result = await this.pool.query(query, values);
    return result.rows.map(this.mapSession);
  }

  // ==================== Reviews ====================

  async createReview(
    studentId: string,
    data: CreateReviewRequest
  ): Promise<MentorReview> {
    // Get session to find mentor
    const session = await this.getSession(data.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const query = `
      INSERT INTO mentor_reviews (
        session_id, mentor_id, student_id, rating,
        communication_rating, knowledge_rating, helpfulness_rating,
        comment, would_recommend, is_public
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      data.sessionId,
      session.mentorId,
      studentId,
      data.rating,
      data.communicationRating,
      data.knowledgeRating,
      data.helpfulnessRating,
      data.comment,
      data.wouldRecommend !== false,
      data.isPublic !== false,
    ];

    const result = await this.pool.query(query, values);
    return this.mapReview(result.rows[0]);
  }

  async getMentorReviews(mentorId: string): Promise<MentorReview[]> {
    const query = `
      SELECT * FROM mentor_reviews
      WHERE mentor_id = $1 AND is_public = true
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [mentorId]);
    return result.rows.map(this.mapReview);
  }

  // ==================== Analytics ====================

  async getMentorAnalytics(mentorId: string): Promise<MentorAnalytics> {
    const profile = await this.getMentorProfile(mentorId);
    if (!profile) {
      throw new Error('Mentor profile not found');
    }

    // Get session stats
    const sessionStats = await this.pool.query(
      `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        AVG(CASE WHEN actual_duration_minutes IS NOT NULL THEN actual_duration_minutes ELSE duration_minutes END) as avg_duration
      FROM mentorship_sessions
      WHERE mentor_id = $1
    `,
      [mentorId]
    );

    // Get review stats
    const reviewStats = await this.pool.query(
      `
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as avg_rating
      FROM mentor_reviews
      WHERE mentor_id = $1
    `,
      [mentorId]
    );

    return {
      totalSessions: parseInt(sessionStats.rows[0].total),
      completedSessions: parseInt(sessionStats.rows[0].completed),
      cancelledSessions: parseInt(sessionStats.rows[0].cancelled),
      averageRating: parseFloat(reviewStats.rows[0].avg_rating || '0'),
      totalReviews: parseInt(reviewStats.rows[0].total_reviews),
      successRate: profile.successRate,
      currentMentees: profile.currentMentees,
      totalMentees: profile.totalSessions, // Approximation
      averageSessionDuration: parseFloat(
        sessionStats.rows[0].avg_duration || '60'
      ),
      responseTime: profile.responseTimeHours,
      topSkills: [], // Would need additional query
      monthlyStats: [], // Would need additional query
    };
  }

  async getStudentStats(studentId: string): Promise<StudentMentorshipStats> {
    const sessionStats = await this.pool.query(
      `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(DISTINCT mentor_id) as active_mentors
      FROM mentorship_sessions
      WHERE student_id = $1
    `,
      [studentId]
    );

    const upcomingSessions = await this.getStudentSessions(
      studentId,
      'scheduled'
    );
    const recentSessions = await this.pool.query(
      `
      SELECT * FROM mentorship_sessions
      WHERE student_id = $1 AND status = 'completed'
      ORDER BY scheduled_at DESC
      LIMIT 5
    `,
      [studentId]
    );

    return {
      totalSessions: parseInt(sessionStats.rows[0].total),
      completedSessions: parseInt(sessionStats.rows[0].completed),
      activeMentors: parseInt(sessionStats.rows[0].active_mentors),
      averageRating: 0, // Would need review query
      goalsInProgress: 0, // Would need progress query
      goalsCompleted: 0, // Would need progress query
      upcomingSessions: upcomingSessions.slice(0, 5),
      recentSessions: recentSessions.rows.map(this.mapSession),
    };
  }

  // ==================== Helper Methods ====================

  private mapMentorProfile(row: any): MentorProfile {
    return {
      id: row.id,
      userId: row.user_id,
      bio: row.bio,
      expertiseAreas: row.expertise_areas || [],
      domains: row.domains || [],
      yearsOfExperience: row.years_of_experience,
      currentRole: row.current_role,
      currentCompany: row.current_company,
      languages: row.languages || [],
      timezone: row.timezone,
      hourlyRate: row.hourly_rate ? parseFloat(row.hourly_rate) : undefined,
      isAvailable: row.is_available,
      maxMentees: row.max_mentees,
      currentMentees: row.current_mentees,
      totalSessions: row.total_sessions,
      averageRating: parseFloat(row.average_rating || '0'),
      successRate: parseFloat(row.success_rate || '0'),
      responseTimeHours: row.response_time_hours,
      linkedinUrl: row.linkedin_url,
      githubUrl: row.github_url,
      portfolioUrl: row.portfolio_url,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapAvailability(row: any): MentorAvailability {
    return {
      id: row.id,
      mentorId: row.mentor_id,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
    };
  }

  private mapMentorshipRequest(row: any): MentorshipRequest {
    return {
      id: row.id,
      studentId: row.student_id,
      mentorId: row.mentor_id,
      requestType: row.request_type,
      topic: row.topic,
      description: row.description,
      preferredLanguages: row.preferred_languages || [],
      urgency: row.urgency,
      status: row.status,
      matchScore: row.match_score ? parseFloat(row.match_score) : undefined,
      requestedAt: new Date(row.requested_at),
      respondedAt: row.responded_at ? new Date(row.responded_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapSession(row: any): MentorshipSession {
    return {
      id: row.id,
      mentorId: row.mentor_id,
      studentId: row.student_id,
      requestId: row.request_id,
      title: row.title,
      description: row.description,
      agenda: row.agenda,
      scheduledAt: new Date(row.scheduled_at),
      durationMinutes: row.duration_minutes,
      meetingUrl: row.meeting_url,
      meetingPlatform: row.meeting_platform,
      status: row.status,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
      actualDurationMinutes: row.actual_duration_minutes,
      notes: row.notes,
      actionItems: row.action_items ? JSON.parse(row.action_items) : undefined,
      followUpDate: row.follow_up_date
        ? new Date(row.follow_up_date)
        : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapReview(row: any): MentorReview {
    return {
      id: row.id,
      sessionId: row.session_id,
      mentorId: row.mentor_id,
      studentId: row.student_id,
      rating: row.rating,
      communicationRating: row.communication_rating,
      knowledgeRating: row.knowledge_rating,
      helpfulnessRating: row.helpfulness_rating,
      comment: row.comment,
      wouldRecommend: row.would_recommend,
      isPublic: row.is_public,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
