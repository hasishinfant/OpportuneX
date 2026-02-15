// Mentor Matching Service Tests

import { Pool } from 'pg';
import { MentorMatchingService } from '../lib/services/mentor-matching.service';

// Mock pg Pool
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('MentorMatchingService', () => {
  let service: MentorMatchingService;
  let mockPool: any;

  beforeEach(() => {
    mockPool = new Pool();
    service = new MentorMatchingService(mockPool);
    jest.clearAllMocks();
  });

  describe('createMentorProfile', () => {
    it('should create a mentor profile successfully', async () => {
      const userId = 'user-123';
      const profileData = {
        bio: 'Experienced software engineer',
        expertiseAreas: ['JavaScript', 'React', 'Node.js'],
        domains: ['Web Development', 'Full Stack'],
        yearsOfExperience: 5,
        currentRole: 'Senior Engineer',
        currentCompany: 'Tech Corp',
        languages: ['English', 'Hindi'],
        timezone: 'Asia/Kolkata',
        hourlyRate: 1000,
        maxMentees: 5,
        linkedinUrl: 'https://linkedin.com/in/test',
        githubUrl: 'https://github.com/test',
        portfolioUrl: 'https://test.com',
      };

      const mockResult = {
        rows: [
          {
            id: 'mentor-123',
            user_id: userId,
            bio: profileData.bio,
            expertise_areas: profileData.expertiseAreas,
            domains: profileData.domains,
            years_of_experience: profileData.yearsOfExperience,
            current_role: profileData.currentRole,
            current_company: profileData.currentCompany,
            languages: profileData.languages,
            timezone: profileData.timezone,
            hourly_rate: profileData.hourlyRate,
            is_available: true,
            max_mentees: profileData.maxMentees,
            current_mentees: 0,
            total_sessions: 0,
            average_rating: 0,
            success_rate: 0,
            response_time_hours: 24,
            linkedin_url: profileData.linkedinUrl,
            github_url: profileData.githubUrl,
            portfolio_url: profileData.portfolioUrl,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      mockPool.query.mockResolvedValue(mockResult);

      const result = await service.createMentorProfile(userId, profileData);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.expertiseAreas).toEqual(profileData.expertiseAreas);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('calculateMatchScore', () => {
    it('should calculate high match score for perfect skill match', async () => {
      const mentor = {
        id: 'mentor-123',
        userId: 'user-123',
        expertiseAreas: ['React', 'Node.js', 'TypeScript'],
        domains: ['Web Development'],
        languages: ['English', 'Hindi'],
        yearsOfExperience: 5,
        isAvailable: true,
        maxMentees: 5,
        currentMentees: 2,
        totalSessions: 50,
        averageRating: 4.8,
        successRate: 90,
        responseTimeHours: 24,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const criteria = {
        studentId: 'student-123',
        skills: ['React', 'Node.js', 'TypeScript'],
        domains: ['Web Development'],
        languages: ['English'],
        experienceLevel: 'intermediate' as const,
      };

      // Mock availability query
      mockPool.query.mockResolvedValue({ rows: [] });

      const score = await (service as any).calculateMatchScore(
        mentor,
        criteria
      );

      expect(score.totalScore).toBeGreaterThan(70);
      expect(score.breakdown.skillMatch).toBe(100);
      expect(score.breakdown.domainMatch).toBe(100);
    });

    it('should calculate lower score for partial match', async () => {
      const mentor = {
        id: 'mentor-123',
        userId: 'user-123',
        expertiseAreas: ['Python', 'Django'],
        domains: ['Backend Development'],
        languages: ['English'],
        yearsOfExperience: 3,
        isAvailable: true,
        maxMentees: 5,
        currentMentees: 4,
        totalSessions: 20,
        averageRating: 4.0,
        successRate: 75,
        responseTimeHours: 48,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const criteria = {
        studentId: 'student-123',
        skills: ['React', 'Node.js'],
        domains: ['Web Development'],
        languages: ['Hindi'],
      };

      mockPool.query.mockResolvedValue({ rows: [] });

      const score = await (service as any).calculateMatchScore(
        mentor,
        criteria
      );

      expect(score.totalScore).toBeLessThan(50);
      expect(score.breakdown.skillMatch).toBe(0);
      expect(score.breakdown.domainMatch).toBe(0);
    });
  });

  describe('setMentorAvailability', () => {
    it('should set mentor availability slots', async () => {
      const mentorId = 'mentor-123';
      const availability = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
        { dayOfWeek: 3, startTime: '14:00', endTime: '17:00' },
      ];

      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: 'avail-1',
            mentor_id: mentorId,
            day_of_week: 1,
            start_time: '09:00',
            end_time: '12:00',
            is_active: true,
            created_at: new Date(),
          },
        ],
      });

      const result = await service.setMentorAvailability(
        mentorId,
        availability
      );

      expect(result).toHaveLength(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM mentor_availability WHERE mentor_id = $1',
        [mentorId]
      );
    });
  });

  describe('createMentorshipRequest', () => {
    it('should create a mentorship request', async () => {
      const studentId = 'student-123';
      const requestData = {
        mentorId: 'mentor-123',
        requestType: 'career',
        topic: 'Career guidance for software engineering',
        description: 'Need help with career planning',
        preferredLanguages: ['English'],
        urgency: 'normal',
      };

      const mockResult = {
        rows: [
          {
            id: 'request-123',
            student_id: studentId,
            mentor_id: requestData.mentorId,
            request_type: requestData.requestType,
            topic: requestData.topic,
            description: requestData.description,
            preferred_languages: requestData.preferredLanguages,
            urgency: requestData.urgency,
            status: 'pending',
            requested_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      mockPool.query.mockResolvedValue(mockResult);

      const result = await service.createMentorshipRequest(
        studentId,
        requestData
      );

      expect(result).toBeDefined();
      expect(result.studentId).toBe(studentId);
      expect(result.topic).toBe(requestData.topic);
      expect(result.status).toBe('pending');
    });
  });

  describe('scheduleSession', () => {
    it('should schedule a mentorship session', async () => {
      const sessionData = {
        mentorId: 'mentor-123',
        requestId: 'student-123',
        title: 'Career Guidance Session',
        description: 'Discussing career path',
        agenda: 'Career planning, skill development',
        scheduledAt: new Date('2024-12-25T10:00:00Z'),
        durationMinutes: 60,
        meetingPlatform: 'google-meet',
      };

      const mockResult = {
        rows: [
          {
            id: 'session-123',
            mentor_id: sessionData.mentorId,
            student_id: sessionData.requestId,
            request_id: sessionData.requestId,
            title: sessionData.title,
            description: sessionData.description,
            agenda: sessionData.agenda,
            scheduled_at: sessionData.scheduledAt,
            duration_minutes: sessionData.durationMinutes,
            meeting_platform: sessionData.meetingPlatform,
            status: 'scheduled',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      mockPool.query.mockResolvedValue(mockResult);

      const result = await service.scheduleSession(sessionData);

      expect(result).toBeDefined();
      expect(result.title).toBe(sessionData.title);
      expect(result.status).toBe('scheduled');
      expect(result.durationMinutes).toBe(60);
    });
  });

  describe('createReview', () => {
    it('should create a mentor review', async () => {
      const studentId = 'student-123';
      const reviewData = {
        sessionId: 'session-123',
        rating: 5,
        communicationRating: 5,
        knowledgeRating: 5,
        helpfulnessRating: 5,
        comment: 'Excellent mentor!',
        wouldRecommend: true,
        isPublic: true,
      };

      // Mock session query
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'session-123',
            mentor_id: 'mentor-123',
            student_id: studentId,
            status: 'completed',
          },
        ],
      });

      // Mock review insert
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'review-123',
            session_id: reviewData.sessionId,
            mentor_id: 'mentor-123',
            student_id: studentId,
            rating: reviewData.rating,
            communication_rating: reviewData.communicationRating,
            knowledge_rating: reviewData.knowledgeRating,
            helpfulness_rating: reviewData.helpfulnessRating,
            comment: reviewData.comment,
            would_recommend: reviewData.wouldRecommend,
            is_public: reviewData.isPublic,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const result = await service.createReview(studentId, reviewData);

      expect(result).toBeDefined();
      expect(result.rating).toBe(5);
      expect(result.comment).toBe('Excellent mentor!');
    });
  });

  describe('getMentorAnalytics', () => {
    it('should return mentor analytics', async () => {
      const mentorId = 'mentor-123';

      // Mock profile query
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: mentorId,
            user_id: 'user-123',
            expertise_areas: ['React'],
            domains: ['Web Dev'],
            years_of_experience: 5,
            languages: ['English'],
            is_available: true,
            max_mentees: 5,
            current_mentees: 3,
            total_sessions: 50,
            average_rating: 4.8,
            success_rate: 90,
            response_time_hours: 24,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      // Mock session stats
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            total: '50',
            completed: '45',
            cancelled: '5',
            avg_duration: '65',
          },
        ],
      });

      // Mock review stats
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            total_reviews: '40',
            avg_rating: '4.8',
          },
        ],
      });

      const result = await service.getMentorAnalytics(mentorId);

      expect(result).toBeDefined();
      expect(result.totalSessions).toBe(50);
      expect(result.completedSessions).toBe(45);
      expect(result.averageRating).toBe(4.8);
      expect(result.successRate).toBe(90);
    });
  });

  describe('Array overlap calculation', () => {
    it('should calculate 100% overlap for identical arrays', () => {
      const arr1 = ['React', 'Node.js', 'TypeScript'];
      const arr2 = ['React', 'Node.js', 'TypeScript'];

      const overlap = (service as any).calculateArrayOverlap(arr1, arr2);

      expect(overlap).toBe(100);
    });

    it('should calculate 50% overlap for half matching arrays', () => {
      const arr1 = ['React', 'Node.js'];
      const arr2 = ['React', 'Python'];

      const overlap = (service as any).calculateArrayOverlap(arr1, arr2);

      expect(overlap).toBe(50);
    });

    it('should return 0 for no overlap', () => {
      const arr1 = ['React', 'Node.js'];
      const arr2 = ['Python', 'Django'];

      const overlap = (service as any).calculateArrayOverlap(arr1, arr2);

      expect(overlap).toBe(0);
    });

    it('should return neutral score for empty criteria', () => {
      const arr1: string[] = [];
      const arr2 = ['React', 'Node.js'];

      const overlap = (service as any).calculateArrayOverlap(arr1, arr2);

      expect(overlap).toBe(50);
    });
  });

  describe('Experience level matching', () => {
    it('should match beginner level correctly', () => {
      const match = (service as any).calculateExperienceMatch('beginner', 2);
      expect(match).toBe(100);
    });

    it('should match intermediate level correctly', () => {
      const match = (service as any).calculateExperienceMatch(
        'intermediate',
        5
      );
      expect(match).toBe(100);
    });

    it('should match advanced level correctly', () => {
      const match = (service as any).calculateExperienceMatch('advanced', 10);
      expect(match).toBe(100);
    });

    it('should handle overqualified mentors', () => {
      const match = (service as any).calculateExperienceMatch('beginner', 10);
      expect(match).toBe(80);
    });

    it('should handle underqualified mentors', () => {
      const match = (service as any).calculateExperienceMatch('advanced', 2);
      expect(match).toBe(30);
    });
  });
});
