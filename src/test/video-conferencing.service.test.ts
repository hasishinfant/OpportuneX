// Video Conferencing Service Tests
import { Pool } from 'pg';
import { VideoConferencingService } from '../lib/services/video-conferencing.service';

// Mock pg Pool
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('VideoConferencingService', () => {
  let service: VideoConferencingService;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = new Pool() as jest.Mocked<Pool>;
    service = new VideoConferencingService(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRoom', () => {
    it('should create a video call room', async () => {
      const mockRoom = {
        id: 'room-123',
        room_code: 'ABC123',
        name: 'Test Room',
        room_type: 'group',
        host_id: 'user-123',
        max_participants: 10,
        status: 'active',
        settings: {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockRoom] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await service.createRoom('user-123', {
        name: 'Test Room',
        roomType: 'group',
      });

      expect(result.room.name).toBe('Test Room');
      expect(result.roomCode).toBe('ABC123');
      expect(result.joinUrl).toContain('/video/ABC123');
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should hash password if provided', async () => {
      const mockRoom = {
        id: 'room-123',
        room_code: 'ABC123',
        name: 'Secure Room',
        room_type: 'group',
        host_id: 'user-123',
        password_hash: 'hashed-password',
        max_participants: 10,
        status: 'active',
        settings: {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockRoom] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await service.createRoom('user-123', {
        name: 'Secure Room',
        roomType: 'group',
        password: 'secret123',
      });

      expect(result.room.passwordHash).toBeTruthy();
    });
  });

  describe('joinRoom', () => {
    it('should allow joining an active room', async () => {
      const mockRoom = {
        id: 'room-123',
        room_code: 'ABC123',
        name: 'Test Room',
        room_type: 'group',
        host_id: 'user-123',
        max_participants: 10,
        status: 'active',
        is_locked: false,
        password_hash: null,
        settings: {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockParticipant = {
        id: 'participant-123',
        room_id: 'room-123',
        peer_id: 'peer-123',
        display_name: 'John Doe',
        role: 'participant',
        is_audio_enabled: true,
        is_video_enabled: true,
        joined_at: new Date(),
        created_at: new Date(),
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockRoom] } as any)
        .mockResolvedValueOnce({ rows: [{ count: '2' }] } as any)
        .mockResolvedValueOnce({ rows: [mockParticipant] } as any);

      const result = await service.joinRoom({
        roomCode: 'ABC123',
        displayName: 'John Doe',
      });

      expect(result.room.roomCode).toBe('ABC123');
      expect(result.participant.displayName).toBe('John Doe');
      expect(result.iceServers).toBeDefined();
      expect(result.token).toBeDefined();
    });

    it('should reject joining a locked room', async () => {
      const mockRoom = {
        id: 'room-123',
        room_code: 'ABC123',
        status: 'active',
        is_locked: true,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockRoom] } as any);

      await expect(
        service.joinRoom({
          roomCode: 'ABC123',
          displayName: 'John Doe',
        })
      ).rejects.toThrow('Room is locked');
    });

    it('should reject joining a full room', async () => {
      const mockRoom = {
        id: 'room-123',
        room_code: 'ABC123',
        status: 'active',
        is_locked: false,
        max_participants: 5,
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockRoom] } as any)
        .mockResolvedValueOnce({ rows: [{ count: '5' }] } as any);

      await expect(
        service.joinRoom({
          roomCode: 'ABC123',
          displayName: 'John Doe',
        })
      ).rejects.toThrow('Room is full');
    });
  });

  describe('updateParticipantMediaState', () => {
    it('should update audio state', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await service.updateParticipantMediaState('participant-123', {
        isAudioEnabled: false,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('is_audio_enabled'),
        expect.arrayContaining([false, 'participant-123'])
      );
    });

    it('should update multiple states', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await service.updateParticipantMediaState('participant-123', {
        isAudioEnabled: false,
        isVideoEnabled: false,
        isHandRaised: true,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('is_audio_enabled'),
        expect.arrayContaining([false, false, true, 'participant-123'])
      );
    });
  });

  describe('createPoll', () => {
    it('should create a poll with options', async () => {
      const mockPoll = {
        id: 'poll-123',
        room_id: 'room-123',
        creator_id: 'participant-123',
        question: 'What is your favorite color?',
        options: [
          { id: 'opt_0', text: 'Red' },
          { id: 'opt_1', text: 'Blue' },
        ],
        allow_multiple: false,
        is_anonymous: false,
        is_active: true,
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockPoll] } as any);

      const result = await service.createPoll('room-123', 'participant-123', {
        question: 'What is your favorite color?',
        options: ['Red', 'Blue'],
      });

      expect(result.question).toBe('What is your favorite color?');
      expect(result.options).toHaveLength(2);
    });
  });

  describe('createBreakoutRooms', () => {
    it('should create multiple breakout rooms', async () => {
      const mockBreakoutRoom = {
        id: 'breakout-123',
        parent_room_id: 'room-123',
        name: 'Breakout Room 1',
        max_participants: 5,
        auto_assign: false,
        is_active: true,
        created_at: new Date(),
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockBreakoutRoom] } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              ...mockBreakoutRoom,
              id: 'breakout-124',
              name: 'Breakout Room 2',
            },
          ],
        } as any);

      const result = await service.createBreakoutRooms('room-123', {
        count: 2,
      });

      expect(result).toHaveLength(2);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('bandwidth measurement', () => {
    it('should save bandwidth measurement', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await service.saveBandwidthMeasurement('participant-123', {
        downloadMbps: 5.2,
        uploadMbps: 3.1,
        latencyMs: 45,
        packetLossPercent: 0.5,
        jitterMs: 8,
        recommendedQuality: 'high',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('bandwidth_measurements'),
        expect.arrayContaining([
          'participant-123',
          5.2,
          3.1,
          45,
          0.5,
          8,
          'high',
        ])
      );
    });
  });
});
