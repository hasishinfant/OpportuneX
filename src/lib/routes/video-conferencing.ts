// Video Conferencing API Routes
import { Request, Response, Router } from 'express';
import { Pool } from 'pg';
import { authMiddleware } from '../middleware/auth';
import { VideoConferencingService } from '../services/video-conferencing.service';

export function createVideoConferencingRoutes(pool: Pool): Router {
  const router = Router();
  const service = new VideoConferencingService(pool);

  /**
   * Create a new video call room
   * POST /api/video/rooms
   */
  router.post('/rooms', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const result = await service.createRoom(userId, req.body);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error creating room:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create room',
      });
    }
  });

  /**
   * Get room by code
   * GET /api/video/rooms/:roomCode
   */
  router.get('/rooms/:roomCode', async (req: Request, res: Response) => {
    try {
      const { roomCode } = req.params;
      const room = await service.getRoomByCode(roomCode);

      if (!room) {
        return res.status(404).json({
          success: false,
          error: 'Room not found',
        });
      }

      res.json({
        success: true,
        data: room,
      });
    } catch (error: any) {
      console.error('Error getting room:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get room',
      });
    }
  });

  /**
   * Join a room
   * POST /api/video/rooms/:roomCode/join
   */
  router.post('/rooms/:roomCode/join', async (req: Request, res: Response) => {
    try {
      const { roomCode } = req.params;
      const userId = (req as any).user?.userId;

      const result = await service.joinRoom(
        {
          roomCode,
          displayName: req.body.displayName,
          password: req.body.password,
        },
        userId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error joining room:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to join room',
      });
    }
  });

  /**
   * Leave a room
   * POST /api/video/participants/:participantId/leave
   */
  router.post(
    '/participants/:participantId/leave',
    async (req: Request, res: Response) => {
      try {
        const { participantId } = req.params;
        await service.leaveRoom(participantId);

        res.json({
          success: true,
          message: 'Left room successfully',
        });
      } catch (error: any) {
        console.error('Error leaving room:', error);
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to leave room',
        });
      }
    }
  );

  /**
   * Update participant media state
   * PATCH /api/video/participants/:participantId/media
   */
  router.patch(
    '/participants/:participantId/media',
    async (req: Request, res: Response) => {
      try {
        const { participantId } = req.params;
        await service.updateParticipantMediaState(participantId, req.body);

        res.json({
          success: true,
          message: 'Media state updated',
        });
      } catch (error: any) {
        console.error('Error updating media state:', error);
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to update media state',
        });
      }
    }
  );

  /**
   * Get room participants
   * GET /api/video/rooms/:roomId/participants
   */
  router.get(
    '/rooms/:roomId/participants',
    async (req: Request, res: Response) => {
      try {
        const { roomId } = req.params;
        const participants = await service.getRoomParticipants(roomId);

        res.json({
          success: true,
          data: participants,
        });
      } catch (error: any) {
        console.error('Error getting participants:', error);
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to get participants',
        });
      }
    }
  );

  /**
   * Start recording
   * POST /api/video/rooms/:roomId/recording/start
   */
  router.post(
    '/rooms/:roomId/recording/start',
    authMiddleware,
    async (req: Request, res: Response) => {
      try {
        const { roomId } = req.params;
        const { format } = req.body;

        const recording = await service.startRecording(roomId, format);

        res.json({
          success: true,
          data: recording,
        });
      } catch (error: any) {
        console.error('Error starting recording:', error);
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to start recording',
        });
      }
    }
  );

  /**
   * Stop recording
   * POST /api/video/recordings/:recordingId/stop
   */
  router.post(
    '/recordings/:recordingId/stop',
    authMiddleware,
    async (req: Request, res: Response) => {
      try {
        const { recordingId } = req.params;
        await service.stopRecording(recordingId);

        res.json({
          success: true,
          message: 'Recording stopped',
        });
      } catch (error: any) {
        console.error('Error stopping recording:', error);
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to stop recording',
        });
      }
    }
  );

  /**
   * Get chat messages
   * GET /api/video/rooms/:roomId/messages
   */
  router.get('/rooms/:roomId/messages', async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const messages = await service.getChatMessages(roomId);

      res.json({
        success: true,
        data: messages,
      });
    } catch (error: any) {
      console.error('Error getting messages:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get messages',
      });
    }
  });

  /**
   * Send chat message
   * POST /api/video/rooms/:roomId/messages
   */
  router.post(
    '/rooms/:roomId/messages',
    async (req: Request, res: Response) => {
      try {
        const { roomId } = req.params;
        const { participantId, content } = req.body;

        const message = await service.saveChatMessage(
          roomId,
          participantId,
          content
        );

        res.json({
          success: true,
          data: message,
        });
      } catch (error: any) {
        console.error('Error sending message:', error);
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to send message',
        });
      }
    }
  );

  /**
   * Create poll
   * POST /api/video/rooms/:roomId/polls
   */
  router.post(
    '/rooms/:roomId/polls',
    authMiddleware,
    async (req: Request, res: Response) => {
      try {
        const { roomId } = req.params;
        const { creatorId } = req.body;

        const poll = await service.createPoll(roomId, creatorId, req.body);

        res.json({
          success: true,
          data: poll,
        });
      } catch (error: any) {
        console.error('Error creating poll:', error);
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to create poll',
        });
      }
    }
  );

  /**
   * Create breakout rooms
   * POST /api/video/rooms/:roomId/breakout-rooms
   */
  router.post(
    '/rooms/:roomId/breakout-rooms',
    authMiddleware,
    async (req: Request, res: Response) => {
      try {
        const { roomId } = req.params;
        const breakoutRooms = await service.createBreakoutRooms(
          roomId,
          req.body
        );

        res.json({
          success: true,
          data: breakoutRooms,
        });
      } catch (error: any) {
        console.error('Error creating breakout rooms:', error);
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to create breakout rooms',
        });
      }
    }
  );

  /**
   * Save bandwidth measurement
   * POST /api/video/participants/:participantId/bandwidth
   */
  router.post(
    '/participants/:participantId/bandwidth',
    async (req: Request, res: Response) => {
      try {
        const { participantId } = req.params;
        await service.saveBandwidthMeasurement(participantId, req.body);

        res.json({
          success: true,
          message: 'Bandwidth measurement saved',
        });
      } catch (error: any) {
        console.error('Error saving bandwidth measurement:', error);
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to save bandwidth measurement',
        });
      }
    }
  );

  /**
   * End room
   * POST /api/video/rooms/:roomId/end
   */
  router.post(
    '/rooms/:roomId/end',
    authMiddleware,
    async (req: Request, res: Response) => {
      try {
        const { roomId } = req.params;
        await service.endRoom(roomId);

        res.json({
          success: true,
          message: 'Room ended',
        });
      } catch (error: any) {
        console.error('Error ending room:', error);
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to end room',
        });
      }
    }
  );

  return router;
}
