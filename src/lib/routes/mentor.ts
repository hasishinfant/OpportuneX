// Mentor Matching API Routes

import { Request, Response, Router } from 'express';
import { Pool } from 'pg';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { MentorMatchingService } from '../services/mentor-matching.service';

export function createMentorRoutes(pool: Pool): Router {
  const router = Router();
  const mentorService = new MentorMatchingService(pool);

  // ==================== Mentor Profile Routes ====================

  // Create mentor profile
  router.post(
    '/profile',
    authenticateToken,
    validateRequest({
      body: {
        expertiseAreas: { type: 'array', required: true },
        domains: { type: 'array', required: true },
        yearsOfExperience: { type: 'number', required: true },
        languages: { type: 'array', required: true },
      },
    }),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.userId;
        const profile = await mentorService.createMentorProfile(
          userId,
          req.body
        );
        res.status(201).json(profile);
      } catch (error: any) {
        console.error('Error creating mentor profile:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Get mentor profile
  router.get(
    '/profile',
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.userId;
        const profile = await mentorService.getMentorProfileByUserId(userId);

        if (!profile) {
          return res.status(404).json({ error: 'Mentor profile not found' });
        }

        res.json(profile);
      } catch (error: any) {
        console.error('Error fetching mentor profile:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Update mentor profile
  router.put(
    '/profile',
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.userId;
        const profile = await mentorService.getMentorProfileByUserId(userId);

        if (!profile) {
          return res.status(404).json({ error: 'Mentor profile not found' });
        }

        const updated = await mentorService.updateMentorProfile(
          profile.id,
          req.body
        );
        res.json(updated);
      } catch (error: any) {
        console.error('Error updating mentor profile:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Get specific mentor profile by ID
  router.get(
    '/profile/:mentorId',
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const { mentorId } = req.params;
        const profile = await mentorService.getMentorProfile(mentorId);

        if (!profile) {
          return res.status(404).json({ error: 'Mentor not found' });
        }

        res.json(profile);
      } catch (error: any) {
        console.error('Error fetching mentor:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== Availability Routes ====================

  // Set mentor availability
  router.post(
    '/availability',
    authenticateToken,
    validateRequest({
      body: {
        availability: { type: 'array', required: true },
      },
    }),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.userId;
        const profile = await mentorService.getMentorProfileByUserId(userId);

        if (!profile) {
          return res.status(404).json({ error: 'Mentor profile not found' });
        }

        const availability = await mentorService.setMentorAvailability(
          profile.id,
          req.body.availability
        );
        res.json(availability);
      } catch (error: any) {
        console.error('Error setting availability:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Get mentor availability
  router.get(
    '/availability/:mentorId',
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const { mentorId } = req.params;
        const availability =
          await mentorService.getMentorAvailability(mentorId);
        res.json(availability);
      } catch (error: any) {
        console.error('Error fetching availability:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== Matching Routes ====================

  // Find matching mentors
  router.post(
    '/match',
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.userId;
        const criteria = {
          studentId: userId,
          ...req.body,
        };

        const matches = await mentorService.findMatchingMentors(criteria);
        res.json(matches);
      } catch (error: any) {
        console.error('Error finding mentors:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== Request Routes ====================

  // Create mentorship request
  router.post(
    '/requests',
    authenticateToken,
    validateRequest({
      body: {
        requestType: { type: 'string', required: true },
        topic: { type: 'string', required: true },
        preferredLanguages: { type: 'array', required: true },
      },
    }),
    async (req: Request, res: Response) => {
      try {
        const studentId = (req as any).user.userId;
        const request = await mentorService.createMentorshipRequest(
          studentId,
          req.body
        );
        res.status(201).json(request);
      } catch (error: any) {
        console.error('Error creating request:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Get student's requests
  router.get(
    '/requests/student',
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const studentId = (req as any).user.userId;
        const requests = await mentorService.getStudentRequests(studentId);
        res.json(requests);
      } catch (error: any) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Get mentor's requests
  router.get(
    '/requests/mentor',
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.userId;
        const profile = await mentorService.getMentorProfileByUserId(userId);

        if (!profile) {
          return res.status(404).json({ error: 'Mentor profile not found' });
        }

        const requests = await mentorService.getMentorRequests(profile.id);
        res.json(requests);
      } catch (error: any) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Update request status
  router.put(
    '/requests/:requestId',
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const { requestId } = req.params;
        const updated = await mentorService.updateMentorshipRequest(
          requestId,
          req.body
        );
        res.json(updated);
      } catch (error: any) {
        console.error('Error updating request:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== Session Routes ====================

  // Schedule session
  router.post(
    '/sessions',
    authenticateToken,
    validateRequest({
      body: {
        mentorId: { type: 'string', required: true },
        title: { type: 'string', required: true },
        scheduledAt: { type: 'string', required: true },
      },
    }),
    async (req: Request, res: Response) => {
      try {
        const session = await mentorService.scheduleSession(req.body);
        res.status(201).json(session);
      } catch (error: any) {
        console.error('Error scheduling session:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Get session details
  router.get(
    '/sessions/:sessionId',
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const { sessionId } = req.params;
        const session = await mentorService.getSession(sessionId);

        if (!session) {
          return res.status(404).json({ error: 'Session not found' });
        }

        res.json(session);
      } catch (error: any) {
        console.error('Error fetching session:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Update session
  router.put(
    '/sessions/:sessionId',
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const { sessionId } = req.params;
        const updated = await mentorService.updateSession(sessionId, req.body);
        res.json(updated);
      } catch (error: any) {
        console.error('Error updating session:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Get mentor's sessions
  router.get(
    '/sessions/mentor/all',
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.userId;
        const profile = await mentorService.getMentorProfileByUserId(userId);

        if (!profile) {
          return res.status(404).json({ error: 'Mentor profile not found' });
        }

        const status = req.query.status as string | undefined;
        const sessions = await mentorService.getMentorSessions(
          profile.id,
          status
        );
        res.json(sessions);
      } catch (error: any) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Get student's sessions
  router.get(
    '/sessions/student/all',
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const studentId = (req as any).user.userId;
        const status = req.query.status as string | undefined;
        const sessions = await mentorService.getStudentSessions(
          studentId,
          status
        );
        res.json(sessions);
      } catch (error: any) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== Review Routes ====================

  // Create review
  router.post(
    '/reviews',
    authenticateToken,
    validateRequest({
      body: {
        sessionId: { type: 'string', required: true },
        rating: { type: 'number', required: true },
      },
    }),
    async (req: Request, res: Response) => {
      try {
        const studentId = (req as any).user.userId;
        const review = await mentorService.createReview(studentId, req.body);
        res.status(201).json(review);
      } catch (error: any) {
        console.error('Error creating review:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Get mentor reviews
  router.get(
    '/reviews/:mentorId',
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const { mentorId } = req.params;
        const reviews = await mentorService.getMentorReviews(mentorId);
        res.json(reviews);
      } catch (error: any) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ==================== Analytics Routes ====================

  // Get mentor analytics
  router.get(
    '/analytics/mentor',
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.userId;
        const profile = await mentorService.getMentorProfileByUserId(userId);

        if (!profile) {
          return res.status(404).json({ error: 'Mentor profile not found' });
        }

        const analytics = await mentorService.getMentorAnalytics(profile.id);
        res.json(analytics);
      } catch (error: any) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Get student stats
  router.get(
    '/analytics/student',
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const studentId = (req as any).user.userId;
        const stats = await mentorService.getStudentStats(studentId);
        res.json(stats);
      } catch (error: any) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  return router;
}
